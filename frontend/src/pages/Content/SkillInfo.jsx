import React, { useState } from "react";
import { Button, Form, Table, Select } from "antd";
import axios from "../../apis/axiosInstance";
import axios2 from "axios";

const { Option } = Select;

const SkillInfo = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`get-data?file_name=${values.role}.xlsx`);
      const responseData = res.data;

      // Dynamically create columns based on the keys in the first response object
      if (responseData.length > 0) {
        const dynamicColumns = Object.keys(responseData[0]).map((key) => ({
          title: key.charAt(0).toUpperCase() + key.slice(1),
          dataIndex: key,
          key: key,
        }));

        // Add a delete column with a delete button
        dynamicColumns.push({
          title: "Action",
          key: "action",
          render: (_, record) => (
            <Button
              type="primary"
              danger
              onClick={() => handleDelete(record, values.role)}
            >
              Delete
            </Button>
          ),
        });

        setColumns(dynamicColumns);
      }

      setData(responseData);
    } catch (error) {
      setError("Error fetching data");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record, role) => {
    setLoading(true);
    setError(null);
    try {
      // Assuming there's an API endpoint to delete the record
      const res = await axios2.delete(
        `http://localhost:5001/delete-row?name=${record.Criteria}&&role=${role}`
      );

      // Show the success message from the response
      if (res.data && res.data.message) {
        alert(res.data.message);
      }
      console.log(data);
      // Remove the deleted record from the local state
      setData((prevData) =>
        prevData.filter((item) => item.Criteria !== record.Criteria)
      );
    } catch (error) {
      setError("Error deleting record");
      console.error("Error deleting record:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-2xl">Skills</div>
      <div className="mt-10">
        <Form
          form={form}
          name="control-hooks"
          onFinish={onFinish}
          style={{
            maxWidth: 600,
          }}
        >
          <div className="flex flex-row">
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
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey={(record) => record.id || record.key}
        />
      </div>
    </div>
  );
};

export default SkillInfo;
