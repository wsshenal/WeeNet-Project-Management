import React, { useState } from "react";
import { Button, Form, Select, message, Input } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import axios from "../../../apis/axiosInstance";

const { Option } = Select;

const QualityAssuranc = () => {
  const [loading, setLoading] = useState(false); // Added loading state
  const [form] = Form.useForm(); // Form instance for resetting
  const [selectedDomains, setSelectedDomains] = useState([]);

  const onFinish = async (values) => {
    setLoading(true);
    console.log(values);
    try {
      const res = await axios.post("employee/insert", {
        role: "Quality Assurance Engineer",
        insert_json: {
          Name: values.name,
          Age: values.age,
          "Home Town": values.home,
          "Phone Number": values.phone,
          "Excellent communication ": values.Excellent_communication,
          "Test Automation": values.Test_Automation,
          "Knowledge of testing methodologies":
            values.Knowledge_of_testing_methodologies,
          "Bug tracking and reporting": values.Bug_tracking_and_reporting,
          "Years of experience in QA": values.Years_of_experience_in_QA,
          "Experience of related Domain": values.experience,
          "Leadership/Team lead experience":
            values.Leadership_Team_lead_experience,
          "Bachelor's Degree": values.Bachelor_Degree,
          "Master's Degree": values.Master_Degree,
        },
      });
      console.log(res);
      Swal.fire(res.data.response, "", "success");
      form.resetFields();
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire("Details Not Saved", "", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDomainChange = (value, index) => {
    const newSelectedDomains = [...selectedDomains];
    newSelectedDomains[index] = value;
    setSelectedDomains(newSelectedDomains);
  };
  return (
    <div>
      <div className="mt-10">
        {/* Bind the form instance to the Form component */}
        <Form form={form} name="common" onFinish={onFinish} autoComplete="off">
          <div className="text-2xl mb-8">Personal Details</div>
          <div className="flex flex-row justify-between">
            <Form.Item
              label="Name"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Please input Your Name!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Age"
              name="age"
              rules={[
                {
                  required: true,
                  message: "Please input Your Age!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Input type="number" />
            </Form.Item>
          </div>
          <div className="flex flex-row justify-between">
            <Form.Item
              label="Home Town"
              name="home"
              rules={[
                {
                  required: true,
                  message: "Please input Your Home Town!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Phone Number"
              name="phone"
              rules={[
                {
                  required: true,
                  message: "Please input Your Phone Number!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Input />
            </Form.Item>
          </div>
          <div className="text-2xl mb-8">Skills</div>
          <Form.Item
            label="Excellent communication"
            name="Excellent_communication"
            rules={[
              {
                required: true,
                message: "Please inputExcellent communication!",
              },
            ]}
            style={{ width: "48%" }}
          >
            <Select placeholder="--Select a Value--" allowClear>
              <Option value="Novice">Novice (20)</Option>
              <Option value="Intermediate">Intermediate (50)</Option>
              <Option value="Advanced">Advanced (100)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Knowledge of testing methodologies"
            name="Knowledge_of_testing_methodologies"
            rules={[
              {
                required: true,
                message: "Please input Knowledge of testing methodologies!",
              },
            ]}
            style={{ width: "48%" }}
          >
            <Select placeholder="--Select a Value--" allowClear>
              <Option value="Novice">Novice (20)</Option>
              <Option value="Intermediate">Intermediate (50)</Option>
              <Option value="Advanced">Advanced (100)</Option>
            </Select>
          </Form.Item>

          <div className="flex flex-row justify-between">
            <Form.Item
              label="Test Automation"
              name="Test_Automation"
              rules={[
                {
                  required: true,
                  message: "Please input Test Automation!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Value--" allowClear>
                <Option value="Novice">Novice (20)</Option>
                <Option value="Intermediate">Intermediate (50)</Option>
                <Option value="Advanced">Advanced (100)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Bug tracking and reporting"
              name="Bug_tracking_and_reporting"
              rules={[
                {
                  required: true,
                  message: "Please input Bug tracking and reporting!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Value--" allowClear>
                <Option value="Novice">Novice (20)</Option>
                <Option value="Intermediate">Intermediate (50)</Option>
                <Option value="Advanced">Advanced (100)</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="text-2xl mb-8">Experiences</div>

          <div className="flex flex-row justify-between">
            <Form.Item
              label="Years of experience in QA"
              name="Years_of_experience_in_QA"
              rules={[
                {
                  required: true,
                  message: "Please input Years of experience in QA!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select years--" allowClear>
                <Option value="1-2 years">1 - 2 years (20)</Option>
                <Option value="3-5 years">3-5 years (50)</Option>
                <Option value="5+ years">5+ years (100)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Leadership/Team lead experience"
              name="Leadership_Team_lead_experience"
              rules={[
                {
                  required: true,
                  message: "Please input Leadership experience!",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Value--" allowClear>
                <Option value="Non-Lead">Non-Lead (0)</Option>
                <Option value="Leadership">Lead (100)</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="pb-3 text-md">
            Experience of Related Domain (Add all 4)
          </div>
          <div>
            <Form.List name="experience">
              {(
                experienceFields,
                { add: addExperience, remove: removeExperience }
              ) => (
                <>
                  {experienceFields.map((experienceField, experienceIndex) => (
                    <div key={experienceField.key}>
                      <div className="flex justify-between items-center pb-3">
                        <h4>Experience {experienceIndex + 1}</h4>
                        {experienceFields.length > 1 && (
                          <MinusCircleOutlined
                            onClick={() => {
                              removeExperience(experienceField.name);
                              const newSelectedDomains = [...selectedDomains];
                              newSelectedDomains.splice(experienceIndex, 1);
                              setSelectedDomains(newSelectedDomains);
                            }}
                          />
                        )}
                      </div>

                      <Form.Item
                        {...experienceField}
                        name={[experienceField.name, "Domain"]}
                        fieldKey={[experienceField.fieldKey, "Domain"]}
                        rules={[
                          {
                            required: true,
                            message: "Please select a domain!",
                          },
                        ]}
                      >
                        <Select
                          placeholder="--Select a Domain--"
                          allowClear
                          onChange={(value) =>
                            handleDomainChange(value, experienceIndex)
                          }
                          value={selectedDomains[experienceIndex]}
                        >
                          {["Health", "Finance", "E-Commerce", "Education"]
                            .filter(
                              (domain) => !selectedDomains.includes(domain)
                            ) // Filter out already selected domains
                            .map((domain) => (
                              <Option key={domain} value={domain}>
                                {domain}
                              </Option>
                            ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        {...experienceField}
                        name={[experienceField.name, "Years"]}
                        fieldKey={[experienceField.fieldKey, "Years"]}
                        rules={[
                          {
                            required: true,
                            message: "Please input years of experience!",
                          },
                        ]}
                      >
                        <Select placeholder="--Select Years--" allowClear>
                          <Option value="0 - 5">0 - 5 Years (20)</Option>
                          <Option value="6 - 14">6 - 14 years (50)</Option>
                          <Option value="15+">15+ Years (100)</Option>
                        </Select>
                      </Form.Item>
                    </div>
                  ))}

                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => addExperience()}
                      icon={<PlusOutlined />}
                      disabled={experienceFields.length >= 4} // Disable the button if 4 or more fields are added
                    >
                      Add Experience
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>

          <div className="text-2xl mb-8">Education</div>

          <div className="flex flex-row justify-between">
            <Form.Item
              name="Bachelor_Degree"
              label="Bachelor's Degree"
              rules={[
                {
                  required: true,
                  message: "Please Select a value",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Value--" allowClear>
                <Option value="related">Yes (100)</Option>
                <Option value="Unrelated">No (50)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="Master_Degree"
              label="Master's Degree"
              rules={[
                {
                  required: true,
                  message: "Please Select a value",
                },
              ]}
              style={{ width: "48%" }}
            >
              <Select placeholder="--Select a Value--" allowClear>
                <Option value="related">Yes (100)</Option>
                <Option value="Unrelated">No (50)</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={loading}>
              Add Employee
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default QualityAssuranc;
