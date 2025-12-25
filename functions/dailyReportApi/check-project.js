require("dotenv").config();
const { MongoClient } = require("mongodb");
const MONGO_URI = process.env.MONGO_URI;

async function check() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("agentworks_db");

  // 查找项目
  const project = await db.collection("projects").findOne({ name: /25年女性M12秒杀/ });
  if (!project) {
    console.log("项目未找到");
    await client.close();
    return;
  }

  console.log("项目ID:", project.id);
  console.log("项目名:", project.name);

  // 查找合作记录
  const collaborations = await db.collection("collaborations").find({ projectId: project.id }).toArray();
  console.log("\n合作记录总数:", collaborations.length);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  console.log("今天日期:", dateStr);

  // 详细检查每条记录
  for (const collab of collaborations) {
    const isPublished = ['published', '视频已发布'].includes(collab.status);
    const publishDate = collab.actualReleaseDate || collab.publishDate;
    const dailyStats = collab.dailyStats || [];
    const todayStats = dailyStats.find(s => s.date === dateStr);

    console.log("\n合作记录:", collab.id);
    console.log("  状态:", collab.status, "| isPublished:", isPublished);
    console.log("  发布日期:", publishDate, "| publishDate <= dateStr:", publishDate <= dateStr);
    console.log("  dailyStats 数量:", dailyStats.length);
    console.log("  dailyStats 日期:", dailyStats.map(s => s.date).join(", "));
    console.log("  todayStats:", todayStats ? "有" : "无");

    // 模拟 forceRefresh=true 的判断
    const forceRefresh = true;
    const shouldIncludeInMissing = isPublished && publishDate && publishDate <= dateStr && (forceRefresh || !todayStats);
    console.log("  forceRefresh=true 时应加入:", shouldIncludeInMissing);
  }

  await client.close();
}

check().catch(console.error);
