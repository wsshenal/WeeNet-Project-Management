import React, { useState } from "react";
import { Button, Form, Select, Input, Radio } from "antd";
// import axios from "../../../apis/axiosInstance";
import axios from "axios";
import Swal from "sweetalert2";

const { Option } = Select; // Import Option from Select

const Education = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [value, setValue] = useState(1); // State to track selected radio button

  const onChange = (e) => {
    setValue(e.target.value);
  };

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("http://localhost:5001/kpi/crud", {
        operation: value,
        role: values.role,
        crud_json: {
          type: "experience",
          criteria: values.criteria,
          level: {
            "Unrelated field": values.un_related,
            "related field": values.related,
          },
          weight: values.weight,
        },
      });

      Swal.fire(res.data.response, "", "success");
    } catch (error) {
      setError("Error fetching data");
      console.error("Error fetching data:", error);
      Swal.fire(error.response, "", "error");
    } finally {
      setLoading(false);
      form.resetFields();
    }
  };

  return (
    <div>
      <Form form={form} name="common" onFinish={onFinish} autoComplete="off">
        <div className="flex flex-row justify-between">
          <Form.Item
            name="operation"
            label="Operation"
            rules={[{ required: true, message: "Please Select an Operation" }]}
            style={{ width: "48%" }}
          >
            <Radio.Group onChange={onChange} value={value}>
              <Radio value="add">Add</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="role"
            label="Job Role"
            rules={[{ required: true, message: "Please Select a Job Role" }]}
            style={{ width: "48%" }}
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
        </div>
        <div className="flex flex-row justify-between">
          <Form.Item
            label="Criteria"
            name="criteria"
            rules={[{ required: true, message: "Please input Criteria!" }]}
            style={{ width: "48%" }}
          >
            <Input />
          </Form.Item>
        </div>

        <div className="flex flex-row justify-between">
          <Form.Item
            name="related"
            label="Related"
            style={{ width: "48%" }}
            rules={[{ required: true, message: "Please input a value!" }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="un_related"
            label="Un Related"
            style={{ width: "48%" }}
            rules={[{ required: true, message: "Please input a value!" }]}
          >
            <Input type="number" />
          </Form.Item>
        </div>

        <Form.Item
          label="weight"
          name="weight"
          rules={[{ required: true, message: "Please input weight!" }]}
          style={{ width: "48%" }}
        >
          <Input type="number" />
        </Form.Item>
        <Form.Item className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={loading}>
            Add
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Education;
