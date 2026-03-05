import React, { useState } from "react";
import { Button, Form, Table, Select, Input, Card, Alert } from "antd";
import { SearchOutlined, UserOutlined, IdcardOutlined, TeamOutlined } from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

const ViewEmployee = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const columns = [
    {
      title: <span className="text-emerald-700 font-semibold">Name</span>,
      dataIndex: "Name",
      key: "name",
      render: (text) => (
        <span className="flex items-center gap-2">
          <UserOutlined className="text-emerald-600" />
          {text}
        </span>
      ),
    },
    {
      title: <span className="text-emerald-700 font-semibold">Home Town</span>,
      dataIndex: "Home Town",
      key: "home town",
    },
    {
      title: <span className="text-emerald-700 font-semibold">Age</span>,
      dataIndex: "Age",
      key: "age",
    },
    {
      title: <span className="text-emerald-700 font-semibold">Domain</span>,
      dataIndex: "Domain",
      key: "domain",
      render: (text) => (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
          {text}
        </span>
      ),
    },
    {
      title: <span className="text-emerald-700 font-semibold">KPI Value (out of 100)</span>,
      dataIndex: "KPI",
      key: "kpi",
      render: (value) => {
        // KPI comes as 0-10 scale, convert to 0-100 percentage
        const score = (value).toFixed(1);
        const percentage = Math.min(100, parseFloat(score));
        
        const color = 
          percentage >= 80 ? "bg-green-500" :
          percentage >= 60 ? "bg-emerald-500" :
          percentage >= 40 ? "bg-yellow-500" :
          "bg-red-500";
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
              <div 
                className={`${color} h-2 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="font-semibold text-emerald-700">{score}%</span>
          </div>
        );
      },
    },
  ];

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("kpi/employee", {
        role: values.role,
        emp_id: values.empId,
      });
      setData(res.data.kpis);
    } catch (error) {
      setError("Error fetching data. Please check the Employee ID and try again.");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <SearchOutlined className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">View Employee</h1>
          </div>
        </div>

        {/* Search Form Card */}
        <Card 
          className="mb-6 border-2 border-emerald-200 shadow-md"
          title={
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-emerald-600" />
              <span className="text-lg font-semibold text-emerald-800">
                Search Employee
              </span>
            </div>
          }
        >
          <Form
            form={form}
            name="control-hooks"
            onFinish={onFinish}
            layout="vertical"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                name="role"
                label={<span className="text-emerald-700 font-medium">Job Role</span>}
                rules={[
                  {
                    required: true,
                    message: "Please Select a Job Role",
                  },
                ]}
              >
                <Select 
                  placeholder="--Select a Role--" 
                  allowClear
                  size="large"
                  suffixIcon={<TeamOutlined className="text-emerald-500" />}
                >
                  <Option value="Business Analyst">Business Analyst</Option>
                  <Option value="Quality Assurance Engineer">
                    Quality Assurance
                  </Option>
                  <Option value="DevOps Engineer">DevOps Engineer</Option>
                  <Option value="Tech Lead">Tech Lead</Option>
                  <Option value="Backend Engineer">Backend Engineer</Option>
                  <Option value="Frontend Engineer">Frontend Engineer</Option>
                  <Option value="FullStack Engineer">FullStack Engineer</Option>
                  <Option value="Project Manager">Project Manager</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={<span className="text-emerald-700 font-medium">Employee ID</span>}
                name="empId"
                rules={[
                  {
                    required: true,
                    message: "Please input Employee ID!",
                  },
                ]}
              >
                <Input 
                  size="large"
                  placeholder="e.g., BA1, FE2, PM3"
                  prefix={<IdcardOutlined className="text-emerald-500" />}
                />
              </Form.Item>

              <Form.Item label={<span className="opacity-0">Button</span>}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                  icon={<SearchOutlined />}
                >
                  Search Employee
                </Button>
              </Form.Item>
            </div>
          </Form>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Results Table Card */}
        <Card 
          className="border-2 border-emerald-200 shadow-md"
          title={
            <div className="flex items-center gap-2">
              <UserOutlined className="text-emerald-600" />
              <span className="text-lg font-semibold text-emerald-800">
                Employee Details
              </span>
            </div>
          }
        >
          <Table 
            columns={columns} 
            dataSource={data} 
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => (
                <span className="text-emerald-700 font-medium">
                  Total {total} record(s)
                </span>
              ),
            }}
            className="custom-green-table"
            locale={{
              emptyText: (
                <div className="py-12">
                  <div className="text-6xl text-emerald-300 mb-3">🔍</div>
                  <p className="text-lg text-emerald-600 font-medium">
                    No employee data found
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please search for an employee using the form above
                  </p>
                </div>
              ),
            }}
          />
        </Card>
      </div>

      <style jsx>{`
        :global(.ant-select-selector) {
          border-color: #d1fae5 !important;
        }
        :global(.ant-select-selector:hover) {
          border-color: #10b981 !important;
        }
        :global(.ant-select-focused .ant-select-selector) {
          border-color: #059669 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }
        :global(.ant-input) {
          border-color: #d1fae5 !important;
        }
        :global(.ant-input:hover) {
          border-color: #10b981 !important;
        }
        :global(.ant-input:focus) {
          border-color: #059669 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }
        :global(.ant-card-head) {
          background: linear-gradient(to right, #d1fae5, #a7f3d0);
          border-bottom: 2px solid #10b981;
        }
        :global(.ant-table-thead > tr > th) {
          background: #d1fae5 !important;
          border-bottom: 2px solid #10b981 !important;
        }
        :global(.ant-table-tbody > tr:hover > td) {
          background: #f0fdf4 !important;
        }
        :global(.ant-btn-primary) {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }
        :global(.ant-btn-primary:hover) {
          background-color: #047857 !important;
          border-color: #047857 !important;
        }
      `}</style>
    </div>
  );
};

export default ViewEmployee;