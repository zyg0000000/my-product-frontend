/**
 * 抓取结果查看弹窗
 *
 * 显示截图和提取的数据
 */

import { Modal, Tabs, Image, Descriptions, Empty } from 'antd';
import { PictureOutlined, FileTextOutlined } from '@ant-design/icons';
import type { RegistrationTalentItem } from '../../../../types/registration';

interface ResultViewModalProps {
  open: boolean;
  talent: RegistrationTalentItem | null;
  onClose: () => void;
}

export function ResultViewModal({
  open,
  talent,
  onClose,
}: ResultViewModalProps) {
  if (!talent || !talent.result) {
    return null;
  }

  const { result } = talent;
  const { screenshots, extractedData } = result;

  const tabItems = [
    {
      key: 'screenshots',
      label: (
        <span className="flex items-center gap-1">
          <PictureOutlined />
          截图 ({screenshots.length})
        </span>
      ),
      children: (
        <div className="space-y-4">
          {screenshots.length === 0 ? (
            <Empty description="暂无截图" />
          ) : (
            <Image.PreviewGroup>
              <div className="grid grid-cols-2 gap-4">
                {screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    className="border border-stroke rounded-lg overflow-hidden"
                  >
                    <Image
                      src={screenshot.url}
                      alt={screenshot.name}
                      className="w-full"
                      placeholder={
                        <div className="flex items-center justify-center h-48 bg-gray-100">
                          <PictureOutlined className="text-4xl text-gray-400" />
                        </div>
                      }
                    />
                    <div className="px-3 py-2 bg-gray-50 text-sm text-content-secondary">
                      {screenshot.name}
                    </div>
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          )}
        </div>
      ),
    },
    {
      key: 'data',
      label: (
        <span className="flex items-center gap-1">
          <FileTextOutlined />
          提取数据
        </span>
      ),
      children: (
        <div>
          {Object.keys(extractedData).length === 0 ? (
            <Empty description="暂无提取数据" />
          ) : (
            <Descriptions bordered column={1} size="small">
              {Object.entries(extractedData).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object'
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={`抓取结果 - ${talent.talentName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <div className="mb-4">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="工作流">
            {result.workflowName}
          </Descriptions.Item>
          <Descriptions.Item label="星图ID">
            {result.xingtuId}
          </Descriptions.Item>
          <Descriptions.Item label="抓取时间">
            {new Date(result.fetchedAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <Tabs items={tabItems} defaultActiveKey="screenshots" />
    </Modal>
  );
}
