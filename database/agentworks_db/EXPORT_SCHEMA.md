# MongoDB Schema 导出指南

## 方式1：使用 mongosh 导出集合结构

### 导出单个集合的schema
```javascript
// 连接到数据库
mongosh "mongodb://your-connection-string/agentworks_db"

// 导出customers集合的一个文档示例
db.customers.findOne()

// 导出为JSON格式
EJSON.stringify(db.customers.findOne(), null, 2)

// 保存到文件
const fs = require('fs');
const doc = db.customers.findOne();
fs.writeFileSync('customers.sample.json', EJSON.stringify(doc, null, 2));
```

### 导出所有集合的schema

```javascript
// 在 mongosh 中执行
db.getCollectionNames().forEach(collection => {
    const sample = db[collection].findOne();
    if (sample) {
        print(`\n=== ${collection} ===`);
        printjson(sample);
    }
});
```

## 方式2：使用命令行导出

### 导出整个数据库结构
```bash
# 导出所有集合的索引信息
mongosh "mongodb://connection-string/agentworks_db" --eval "
db.getCollectionNames().forEach(coll => {
    print('\\n=== ' + coll + ' Indexes ===');
    printjson(db[coll].getIndexes());
});
"
```

### 导出单个集合的示例文档
```bash
# 导出customers的一个示例
mongosh "mongodb://connection-string/agentworks_db" --eval "
printjson(db.customers.findOne());
" > customers.sample.json
```

## 方式3：导出到本地schemas目录

### 创建schema导出脚本
```bash
# 创建导出脚本
cat > export-schemas.sh << 'EOF'
#!/bin/bash

DB_NAME="agentworks_db"
OUTPUT_DIR="./schemas"

mkdir -p $OUTPUT_DIR

# 导出所有集合的示例文档
mongosh "mongodb://connection-string/$DB_NAME" --quiet --eval "
db.getCollectionNames().forEach(collection => {
    const doc = db[collection].findOne();
    if (doc) {
        print(EJSON.stringify(doc, null, 2));
    }
});
" > "$OUTPUT_DIR/all-samples.json"

echo "Schema导出完成: $OUTPUT_DIR/all-samples.json"
EOF

chmod +x export-schemas.sh
./export-schemas.sh
```

## 方式4：MongoDB Compass 导出

1. 打开 MongoDB Compass
2. 连接到 agentworks_db
3. 选择集合（如 customers）
4. 点击 "Documents" 标签
5. 选择一个文档
6. 点击右侧 "..." → "Copy Document"
7. 粘贴到编辑器，保存为 .json 文件

## 导出集合列表和字段信息

```javascript
// 在 mongosh 中执行
db.getCollectionNames().forEach(collName => {
    const coll = db[collName];
    const sample = coll.findOne();

    print(`\n集合: ${collName}`);
    print(`文档数: ${coll.countDocuments()}`);
    print(`字段列表:`);

    if (sample) {
        Object.keys(sample).forEach(field => {
            print(`  - ${field}: ${typeof sample[field]}`);
        });
    }

    print(`\n索引:`);
    coll.getIndexes().forEach(idx => {
        print(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
});
```

## 快速查看当前数据库所有集合

```javascript
// mongosh
use agentworks_db

// 查看所有集合
show collections

// 查看每个集合的文档数
db.getCollectionNames().forEach(c => {
    print(c + ': ' + db[c].countDocuments());
});
```

## 示例：导出customers集合到schemas目录

```bash
# 1. 进入scripts目录
cd database/agentworks_db/scripts

# 2. 使用mongosh导出
mongosh "your-mongodb-uri/agentworks_db" --quiet --eval "
const doc = db.customers.findOne();
print(EJSON.stringify(doc, null, 2));
" > ../schemas/customers.schema.json

# 3. 查看导出结果
cat ../schemas/customers.schema.json
```

## 完整导出所有schema的脚本

```bash
#!/bin/bash
# 保存为 export-all-schemas.sh

MONGO_URI="mongodb://your-connection-string"
DB_NAME="agentworks_db"
OUTPUT_DIR="./schemas"

echo "开始导出 $DB_NAME 所有集合的schema..."

mongosh "$MONGO_URI/$DB_NAME" --quiet --eval "
db.getCollectionNames().forEach(collName => {
    const doc = db[collName].findOne();
    if (doc) {
        const filename = collName + '.schema.json';
        print('导出: ' + filename);
        // 这里输出JSON，外部脚本会重定向到文件
    }
});
"

echo "完成！"
```
