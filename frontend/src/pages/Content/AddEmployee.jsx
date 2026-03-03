import React, { useState } from "react";
import { Button, Form, Select } from "antd";
import BusinessAnalyst from "./EmployeeDetails/BusinessAnalyst";
import QualityAssuranc from "./EmployeeDetails/QualityAssuranc";
import DevopsEngineer from "./EmployeeDetails/DevopsEngineer";
import TechLead from "./EmployeeDetails/TechLead";
import BackendEngineer from "./EmployeeDetails/BackendEngineer";
import FrontendEngineer from "./EmployeeDetails/FrontendEngineer";
import FullStackEngineer from "./EmployeeDetails/FullStackEngineer";
import ProjectManager from "./EmployeeDetails/ProjectManager";

const { Option } = Select;

const AddEmployee = () => {
  const [data, setData] = useState("");

  const onValuesChange = (changedValues, allValues) => {
    setData(allValues.role);
  };

  return (
    <div>
      <div className="text-2xl">Add Employee</div>
      <div className="text-xl mt-2 flex justify-end">
        KPI Score = (P<span className="mt-2 text-sm">1</span> × W
        <span className="mt-2 text-sm">a</span>) + (P
        <span className="mt-2 text-sm">2</span> × W
        <span className="mt-2 text-sm">b</span>) + (P
        <span className="mt-2 text-sm">3</span> × W
        <span className="mt-2 text-sm">c</span>) + ...
        <br />
      </div>
      <span className="text-md mt-3 flex justify-end">
        P = Performance Index, W = Weight for each criterion
      </span>

      <div className="mt-10">
        <Form name="common" onValuesChange={onValuesChange} autoComplete="off">
          <Form.Item
            name="role"
            label="Role"
            rules={[
              {
                required: true,
                message: "Please Select a Role",
              },
            ]}
            style={{ width: "48%" }}
          >
            <Select placeholder="--Select a Role--" allowClear>
              <Option value="BA">Business Analyst</Option>
              <Option value="QA">Quality Assurance</Option>
              <Option value="DE">DevOps Engineer</Option>
              <Option value="TL">Tech Lead</Option>
              <Option value="BE">Backend Engineer</Option>
              <Option value="FE">Frontend Engineer</Option>
              <Option value="FullE">FullStack Engineer</Option>
              <Option value="PM">Project Manager</Option>
            </Select>
          </Form.Item>
        </Form>
      </div>
      <div className="mt-8">
        {data === "BA" ? (
          <BusinessAnalyst />
        ) : data === "QA" ? (
          <QualityAssuranc />
        ) : data === "DE" ? (
          <DevopsEngineer />
        ) : data === "TL" ? (
          <TechLead />
        ) : data === "BE" ? (
          <BackendEngineer />
        ) : data === "FE" ? (
          <FrontendEngineer />
        ) : data === "FullE" ? (
          <FullStackEngineer />
        ) : data === "PM" ? (
          <ProjectManager />
        ) : (
          <>Select a Role</>
        )}
      </div>
    </div>
  );
};

export default AddEmployee;
