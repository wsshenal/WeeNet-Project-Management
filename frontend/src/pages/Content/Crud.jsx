import React, { useState } from "react";
import { Form, Select } from "antd";
import Education from "./skillTypes/Education";
import Skills from "./skillTypes/Skills";
import Experience from "./skillTypes/Experience";
const { Option } = Select;

const Crud = () => {
  const [data, setData] = useState();

  const onValuesChange = (changedValues, allValues) => {
    setData(allValues.type);
  };

  return (
    <div>
      {" "}
      <Form name="common" onValuesChange={onValuesChange} autoComplete="off">
        <div className="flex flex-row justify-between">
          <Form.Item
            name="type"
            label="Type"
            rules={[
              {
                required: true,
                message: "Please Select a Type",
              },
            ]}
            style={{ width: "48%" }}
          >
            <Select placeholder="--Select a Value--" allowClear>
              <Option value="skills">Skills</Option>
              <Option value="education">Education</Option>
              <Option value="experience">Experience</Option>
            </Select>
          </Form.Item>
        </div>
      </Form>
      <div className="">
        {data === "skills" ? (
          <Skills />
        ) : data === "education" ? (
          <Education />
        ) : data === "experience" ? (
          <Experience />
        ) : (
          <>Select a Role</>
        )}
      </div>
    </div>
  );
};

export default Crud;
