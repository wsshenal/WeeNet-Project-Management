import React, { useState } from "react";
import { Button, Form, Input, Select } from "antd";
import Swal from "sweetalert2";
import axios from "../../apis/axiosInstance";

const Requirement = () => {
  const [form] = Form.useForm();
  const [isOther, setIsOther] = useState(false);

  const onFinish = async (values) => {
    try {
      const data = {
        Name: values.name,
        Domain: values.domain,
        ML_Components:
          values.ML_Components === "Other" ? values.other : values.ML_Components,
        Backend: values.Backend,
        Frontend: values.Frontend,
        Core_Features: values.Core_Features,
        Tech_Stack: values.Tech_Stack,
        Mobile: Number(values.Mobile),
        Desktop: Number(values.Desktop),
        Web: Number(values.Web),
        IoT: Number(values.IoT),
        Expected_Team_Size: Number(values.Expected_Team_Size),
        Expected_Budget: Number(values.Expected_Budget),
        status: 2,
        project_scope: values.project_scope,
        requirement_specifity: values.requirement_specifity,
        team_experience: values.team_experience,
      };

      await axios.post("save-data", data);
      localStorage.setItem("SearchPayload", JSON.stringify(data));
      Swal.fire("Details Saved", "", "success");
    } catch (error) {
      console.log(error);
      Swal.fire("Failed to save details", "", "error");
    } finally {
      form.resetFields();
      setIsOther(false);
    }
  };

  const handleOnChange = (value) => {
    setIsOther(value === "Other");
    if (value !== "Other") {
      form.setFieldValue("other", undefined);
    }
  };

  const yesNoOptions = [
    { value: "1", label: "Yes" },
    { value: "0", label: "No" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#24381a]">Requirements</h1>
        <p className="text-sm text-[#5f6f52]">Project setup and constraints</p>
      </div>

      <Form form={form} name="common" onFinish={onFinish} autoComplete="off" layout="vertical">
        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Project Name"
            name="name"
            rules={[{ required: true, message: "Please input project name" }]}
            className="lg:col-span-2"
          >
            <Input type="text" placeholder="Enter project name" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            name="Backend"
            label="Backend Technology"
            rules={[{ required: true, message: "Please Select a Backend Technology" }]}
          >
            <Select
              placeholder="--Select a Technology--"
              allowClear
              options={[
                { value: "Node.js", label: "Node.js" },
                { value: "Django", label: "Django" },
                { value: "Flask", label: "Flask" },
                { value: "Spring Boot", label: "Spring Boot" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="Frontend"
            label="Frontend Technology"
            rules={[{ required: true, message: "Please Select a Frontend Technology" }]}
          >
            <Select
              placeholder="--Select a Technology--"
              allowClear
              options={[
                { value: "React", label: "React.js" },
                { value: "Angular", label: "Angular" },
                { value: "Vue.js", label: "Vue.js" },
                { value: "Svelte", label: "Svelte" },
              ]}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            name="domain"
            label="Domain"
            rules={[{ required: true, message: "Please Select a Domain" }]}
          >
            <Select
              placeholder="--Select a Domain--"
              allowClear
              options={[
                { value: "Finance", label: "Finance" },
                { value: "E-Commerce", label: "E-Commerce" },
                { value: "Health", label: "Health" },
                { value: "Education", label: "Education" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Project Scope"
            name="project_scope"
            rules={[{ required: true, message: "Please input Project scope!" }]}
          >
            <Select
              placeholder="--Select a value--"
              allowClear
              options={[
                { value: "Wide", label: "Wide" },
                { value: "Medium", label: "Medium" },
              ]}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item label="ML Component" name="ML_Components">
            <Select
              onChange={handleOnChange}
              placeholder="--Select a ML Component--"
              allowClear
              options={[
                { value: "Prediction Model", label: "Prediction Model" },
                { value: "Recommendation Engine", label: "Recommendation Engine" },
                { value: "Classification Model", label: "Classification Model" },
                { value: "Clustering Algorithm", label: "Clustering Algorithm" },
                { value: "Other", label: "Other" },
              ]}
            />
          </Form.Item>
          {isOther ? (
            <Form.Item
              label="Other ML Component"
              name="other"
              rules={[{ required: true, message: "Please enter the ML component" }]}
            >
              <Input placeholder="Type custom ML component" />
            </Form.Item>
          ) : (
            <div />
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Core Features"
            name="Core_Features"
            rules={[{ required: true, message: "Please input Core Features!" }]}
          >
            <Select
              placeholder="--Select a Core Feature--"
              allowClear
              options={[
                { value: "User Management", label: "User Management" },
                { value: "Payment Gateway", label: "Payment Gateway" },
                { value: "Appointment Booking", label: "Appointment Booking" },
                { value: "Product Catalog", label: "Product Catalog" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Tech Stack"
            name="Tech_Stack"
            rules={[{ required: true, message: "Please input Tech Stack!" }]}
          >
            <Select
              placeholder="--Select one--"
              allowClear
              options={[
                { value: "MERN", label: "MERN" },
                { value: "MEAN", label: "MEAN" },
                { value: "LAMP", label: "LAMP" },
                { value: "Serverless", label: "Serverless" },
              ]}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Mobile"
            name="Mobile"
            rules={[{ required: true, message: "Please input Mobile!" }]}
          >
            <Select placeholder="--Select one--" allowClear options={yesNoOptions} />
          </Form.Item>
          <Form.Item
            label="Desktop"
            name="Desktop"
            rules={[{ required: true, message: "Please input Desktop!" }]}
          >
            <Select placeholder="--Select one--" allowClear options={yesNoOptions} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Web"
            name="Web"
            rules={[{ required: true, message: "Please input Web!" }]}
          >
            <Select placeholder="--Select one--" allowClear options={yesNoOptions} />
          </Form.Item>
          <Form.Item
            label="IoT"
            name="IoT"
            rules={[{ required: true, message: "Please input IoT!" }]}
          >
            <Select placeholder="--Select one--" allowClear options={yesNoOptions} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Requirement Specificity"
            name="requirement_specifity"
            rules={[{ required: true, message: "Please Select Requirement Specificity!" }]}
          >
            <Select
              placeholder="--Select one--"
              allowClear
              options={[
                { value: "Well defined", label: "Well Defined" },
                { value: "Average", label: "Average" },
                { value: "Poor", label: "Poor" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Expected Team Size"
            name="Expected_Team_Size"
            rules={[{ required: true, message: "Please input Expected Team Size!" }]}
          >
            <Input type="number" min={1} placeholder="e.g. 12" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
          <Form.Item
            label="Expected Budget ($)"
            name="Expected_Budget"
            rules={[{ required: true, message: "Please input Expected Budget!" }]}
          >
            <Input type="number" min={0} placeholder="e.g. 150000" />
          </Form.Item>
          <Form.Item
            label="Team Experience"
            name="team_experience"
            rules={[{ required: true, message: "Please Select Team Experience!" }]}
          >
            <Select
              placeholder="--Select one--"
              allowClear
              options={[
                { value: "High", label: "High" },
                { value: "Mixed", label: "Mixed" },
                { value: "Medium", label: "Medium" },
                { value: "Low", label: "Low" },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item className="mb-0 mt-2 flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            className="h-10 rounded-lg bg-[#4D6F2F] px-6 font-semibold shadow-sm hover:!bg-[#3f5e28]"
          >
            Save Requirements
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Requirement;
