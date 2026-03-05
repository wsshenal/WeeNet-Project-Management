import React, { useState } from "react";
import {
  Card,
  Button,
  Typography,
  Statistic,
  Row,
  Col,
  Table,
  Progress,
  Tag,
} from "antd";
import { TeamOutlined, RobotOutlined } from "@ant-design/icons";
import axios from "../../apis/axiosInstance";

const { Title, Text } = Typography;

const MLTeamPrediction = () => {
  const [loading, setLoading] = useState(false);
  const [teamPrediction, setTeamPrediction] = useState(null);

  const predictTeam = async () => {
    setLoading(true);
    try {
      // Get team from localStorage (from your existing team selection)
      const selectedTeam = JSON.parse(localStorage.getItem("team") || "[]");

      const res = await axios.post("/ml/predict_team", {
        team_members: selectedTeam,
      });

      setTeamPrediction(res.data.team_prediction);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Employee ID",
      dataIndex: "emp_id",
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role) => <Tag color="green">{role}</Tag>,
    },
    {
      title: "Predicted KPI",
      dataIndex: "predicted_kpi_score",
      render: (value) => (
        <div>
          <Progress
            percent={value}
            strokeColor="#6A953F"
            showInfo={false}
            style={{ width: 150 }}
          />
          <Text strong>{value.toFixed(2)}</Text>
        </div>
      ),
      sorter: (a, b) => a.predicted_kpi_score - b.predicted_kpi_score,
    },
    {
      title: "Category",
      dataIndex: "performance_category",
      render: (cat) => (
        <Tag
          color={
            cat === "High" ? "green" : cat === "Medium" ? "orange" : "red"
          }
        >
          {cat}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ background: "#F6FAF3", padding: 40, minHeight: "100vh" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Title level={2} style={{ color: "#4D6F2F" }}>
          <RobotOutlined /> AI Team Performance Predictor
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Analyze your team's predicted performance with ML
        </Text>
      </div>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Button
          type="primary"
          size="large"
          icon={<TeamOutlined />}
          onClick={predictTeam}
          loading={loading}
          style={{
            background: "linear-gradient(135deg, #6A953F, #96BD68)",
            border: "none",
            height: 50,
            fontSize: 16,
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          Predict Team KPI
        </Button>
      </div>

      {teamPrediction && (
        <>
          {/* Team Statistics */}
          <Row gutter={24} style={{ marginBottom: 32 }}>
            <Col span={6}>
              <Card style={{ borderRadius: 16, textAlign: "center" }}>
                <Statistic
                  title="Team Average KPI"
                  value={teamPrediction.team_average_kpi.toFixed(2)}
                  suffix="/ 100"
                  valueStyle={{ color: "#6A953F" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ borderRadius: 16, textAlign: "center" }}>
                <Statistic
                  title="Median KPI"
                  value={teamPrediction.team_median_kpi.toFixed(2)}
                  valueStyle={{ color: "#4D6F2F" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ borderRadius: 16, textAlign: "center" }}>
                <Statistic
                  title="Top Performer"
                  value={teamPrediction.team_max_kpi.toFixed(2)}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{ borderRadius: 16, textAlign: "center" }}>
                <Statistic
                  title="Standard Deviation"
                  value={teamPrediction.team_std_kpi.toFixed(2)}
                  valueStyle={{ color: "#096dd9" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Performance Distribution */}
          <Card style={{ marginBottom: 32, borderRadius: 16 }}>
            <Title level={4} style={{ color: "#4D6F2F" }}>
              Performance Distribution
            </Title>
            <Row gutter={24}>
              <Col span={8}>
                <Card style={{ background: "#f6ffed", borderRadius: 12 }}>
                  <Statistic
                    title="High Performers"
                    value={teamPrediction.performance_distribution.High}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card style={{ background: "#fffbe6", borderRadius: 12 }}>
                  <Statistic
                    title="Medium Performers"
                    value={teamPrediction.performance_distribution.Medium}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card style={{ background: "#fff1f0", borderRadius: 12 }}>
                  <Statistic
                    title="Needs Improvement"
                    value={teamPrediction.performance_distribution.Low}
                    valueStyle={{ color: "#ff4d4f" }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Individual Predictions Table */}
          <Card style={{ borderRadius: 16 }}>
            <Title level={4} style={{ color: "#4D6F2F" }}>
              Individual Predictions
            </Title>
            <Table
              columns={columns}
              dataSource={teamPrediction.individual_predictions}
              rowKey="emp_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default MLTeamPrediction;