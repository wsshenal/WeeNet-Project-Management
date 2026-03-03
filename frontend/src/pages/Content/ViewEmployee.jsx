import React, { useState } from "react";
import { Button, Form, Table, Select, Input } from "antd";
import axios from "../../apis/axiosInstance";

const { Option } = Select;

const columns = [
  {
    title: "Name",
    dataIndex: "Name",
    key: "name",
  },
  {
    title: "Home Town",
    dataIndex: "Home Town",
    key: "home town",
  },
  {
    title: "Age",
    dataIndex: "Age",
    key: "age",
  },
  {
    title: "Domain",
    dataIndex: "Domain",
    key: "domain",
  },
  {
    title: "KPI Value (out of 100)",
    dataIndex: "KPI",
    key: "kpi",
  },
];

const ViewEmployee = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false); // Added loading state
  const [error, setError] = useState(null); // Added error state

  const onFinish = async (values) => {
    setLoading(true); // Start loading
    setError(null); // Reset error state
    try {
      const res = await axios.post("kpi/employee", {
        role: values.role,
        emp_id: values.empId,
      });
      setData(res.data.kpis);
    } catch (error) {
      setError("Error fetching data");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <div>
      <div className="text-2xl">View Employee</div>
      <div className="mt-10">
        <Form
          form={form}
          name="control-hooks"
          onFinish={onFinish}
          style={{
            maxWidth: 600,
          }}
        >
          <div className="flex flex-row justify-between">
            <Form.Item
              name="role"
              label="Job Role"
              rules={[
                {
                  required: true,
                  message: "Please Select a Job Role",
                },
              ]}
            >
              <Select placeholder="--Select a Role--" allowClear>
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
              label="Employee ID"
              name="empId"
              rules={[
                {
                  required: true,
                  message: "Please input Employee ID!",
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              wrapperCol={{
                offset: 6,
                span: 16,
              }}
            >
              <Button type="primary" htmlType="submit" style={{backgroundColor: "#B0D287"}} loading={loading}>
                Submit
              </Button>
            </Form.Item>
          </div>
        </Form>
      </div>
      <div>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <Table columns={columns} dataSource={data} loading={loading} />{" "}
      </div>
    </div>
  );
};

export default ViewEmployee;
