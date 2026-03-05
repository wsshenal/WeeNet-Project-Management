import React, { useState } from "react";
import { Form, Select, Card, Typography, ConfigProvider } from "antd";
import { BookOutlined, TrophyOutlined, RocketOutlined } from "@ant-design/icons";
import Education from "./skillTypes/Education";
import Skills from "./skillTypes/Skills";
import Experience from "./skillTypes/Experience";

const { Option } = Select;
const { Title, Text } = Typography;

const Crud = () => {
  const [data, setData] = useState();

  const onValuesChange = (_, allValues) => {
    setData(allValues.type);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6A953F",
          borderRadius: 12,
        },
        components: {
          Select: {
            controlHeight: 50, // Taller, more modern inputs
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          },
        },
      }}
    >
      <div style={{ background: "#F6FAF3", minHeight: "100vh", padding: "40px 20px" }}>
        {/* Header Section */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <Title level={2} style={{ color: "#2D401F", marginBottom: 8, fontWeight: 800 }}>
            KPI Management Portal
          </Title>
          <Text style={{ color: "#6B7280", fontSize: 16 }}>
            Define the metrics that drive growth and excellence
          </Text>
        </div>

        {/* Floating Style Filter Card */}
        <Card
          bordered={false}
          style={{
            maxWidth: 800,
            margin: "0 auto",
            borderRadius: 24,
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 40px rgba(77, 111, 47, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <Form name="common" onValuesChange={onValuesChange} layout="vertical">
            <Form.Item
              name="type"
              label={<span style={{ fontWeight: 600, color: "#4D6F2F", marginLeft: 4 }}>Metric Category</span>}
            >
              <Select
                placeholder="Search or select a category..."
                allowClear
                suffixIcon={<RocketOutlined style={{ color: "#96BD68" }} />}
                dropdownStyle={{ borderRadius: 12 }}
              >
                <Option value="skills">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrophyOutlined style={{ color: '#FAAD14' }} /> <span>Professional Skills</span>
                  </div>
                </Option>
                <Option value="education">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOutlined style={{ color: '#1890FF' }} /> <span>Academic Background</span>
                  </div>
                </Option>
                <Option value="experience">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RocketOutlined style={{ color: '#52C41A' }} /> <span>Work Experience</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Form>
        </Card>

        {/* Dynamic Content Area */}
        <div style={{ maxWidth: 1000, margin: "32px auto" }}>
          {!data ? (
            <Card
              style={{
                textAlign: "center",
                padding: "80px 0",
                borderRadius: 24,
                border: "2px dashed #D9E4D1",
                background: "transparent",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <Title level={4} style={{ color: "#4D6F2F", margin: 0 }}>
                Ready to start?
              </Title>
              <Text type="secondary">Select a category above to populate the KPI data fields</Text>
            </Card>
          ) : (
            <div className="fade-in-content">
              {data === "skills" && <Skills />}
              {data === "education" && <Education />}
              {data === "experience" && <Experience />}
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Crud;