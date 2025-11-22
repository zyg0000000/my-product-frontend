/**
 * 客户新增/编辑页面 - 使用 Ant Design Pro (优化布局)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
  ProFormList,
  ProCard,
} from '@ant-design/pro-components';
import { Button, message, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import type { Customer } from '../../types/customer';
import { customerApi } from '../../services/customerApi';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [initialValues, setInitialValues] = useState<any>();
  const [loading, setLoading] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      loadCustomerData();
    }
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await customerApi.getCustomerById(id);
      if (response.success) {
        setInitialValues({
          name: response.data.name,
          level: response.data.level,
          status: response.data.status,
          industry: response.data.industry,
          contacts: response.data.contacts || [{ isPrimary: true }],
          notes: response.data.notes,
        });
      }
    } catch (error) {
      message.error('加载客户信息失败');
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      let response;
      if (isEditMode && id) {
        response = await customerApi.updateCustomer(id, values);
        message.success('客户信息更新成功');
      } else {
        response = await customerApi.createCustomer(values);
        message.success('客户创建成功');
      }

      if (response.success) {
        navigate('/customers/list');
      }
      return true;
    } catch (error) {
      message.error(isEditMode ? '更新失败' : '创建失败');
      console.error('Error submitting customer:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <ProCard>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers/list')}>
            返回列表
          </Button>
          <h1 className="text-lg font-semibold m-0">
            {isEditMode ? '编辑客户' : '新增客户'}
          </h1>
        </Space>
      </ProCard>

      {/* 表单区域 */}
      <ProCard>
        <ProForm
          initialValues={
            initialValues || {
              level: 'medium',
              status: 'active',
              contacts: [{ isPrimary: true }],
            }
          }
          onFinish={handleSubmit}
          submitter={{
            render: (props) => (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => props.form?.submit()}
                  loading={props.form?.isFieldsTouched()}
                >
                  {isEditMode ? '保存修改' : '创建客户'}
                </Button>
                <Button onClick={() => navigate('/customers/list')}>取消</Button>
              </div>
            ),
          }}
        >
          {/* 基础信息 */}
          <ProCard title="基础信息" headerBordered collapsible defaultCollapsed={false}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <ProFormText
                name="name"
                label="客户名称"
                placeholder="请输入客户名称"
                rules={[{ required: true, message: '请输入客户名称' }]}
              />
              <ProFormSelect
                name="level"
                label="客户级别"
                placeholder="选择客户级别"
                valueEnum={{
                  VIP: 'VIP客户',
                  large: '大型客户',
                  medium: '中型客户',
                  small: '小型客户',
                }}
                rules={[{ required: true, message: '请选择客户级别' }]}
              />
              <ProFormSelect
                name="status"
                label="状态"
                placeholder="选择状态"
                valueEnum={{
                  active: '活跃',
                  inactive: '停用',
                }}
                rules={[{ required: true, message: '请选择状态' }]}
              />
            </div>
            <ProFormText
              name="industry"
              label="所属行业"
              placeholder="如：互联网、快消、金融等"
            />
          </ProCard>

          {/* 联系人信息 */}
          <ProCard
            title="联系人信息"
            headerBordered
            collapsible
            defaultCollapsed={false}
            className="mt-4"
          >
            <ProFormList
              name="contacts"
              creatorButtonProps={{
                creatorButtonText: '+ 添加联系人',
                type: 'dashed',
                style: { width: '100%' },
              }}
              min={1}
              copyIconProps={false}
              deleteIconProps={{
                tooltipText: '删除',
              }}
              itemRender={({ listDom, action }, { index }) => (
                <div className="border rounded-lg p-4 mb-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">联系人 {index + 1}</span>
                    {action}
                  </div>
                  {listDom}
                </div>
              )}
            >
              <div className="grid grid-cols-4 gap-4">
                <ProFormText
                  name="name"
                  label="姓名"
                  placeholder="联系人姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                />
                <ProFormText
                  name="position"
                  label="职位"
                  placeholder="如：采购经理"
                />
                <ProFormText
                  name="phone"
                  label="手机号"
                  placeholder="13800138000"
                  rules={[
                    {
                      pattern: /^1[3-9]\d{9}$/,
                      message: '请输入正确的手机号',
                    },
                  ]}
                />
                <ProFormText
                  name="email"
                  label="邮箱"
                  placeholder="example@company.com"
                  rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
                />
              </div>
            </ProFormList>
          </ProCard>

          {/* 备注信息 */}
          <ProCard
            title="备注信息"
            headerBordered
            collapsible
            defaultCollapsed={false}
            className="mt-4"
          >
            <ProFormTextArea
              name="notes"
              label="备注"
              placeholder="可以记录客户的特殊要求、合作历史、价格协商过程等信息"
              fieldProps={{
                rows: 4,
                showCount: true,
                maxLength: 500,
              }}
            />
          </ProCard>
        </ProForm>
      </ProCard>
    </div>
  );
}
