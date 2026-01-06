import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Spin, Progress, Tag, Row, Col, Statistic, message } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined, WarningOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './index.css';
import logoImage from './assets/logo.jpg';

const { Option } = Select;

function App() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5002/predict', {
        Domain: values.domain,
        Mobile: values.mobile,
        Desktop: values.desktop,
        Web: values.web,
        IoT: values.iot,
        Expected_Team_Size: parseInt(values.teamSize),
        Expected_Budget: parseFloat(values.expectedBudget),
        Risk: parseInt(values.risk),
        Complexity_Level: values.complexity,
        Date_Difference: 0
      });

      setResult(response.data);
      message.success('Budget forecast generated successfully!');
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to generate forecast. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoData = () => {
    form.setFieldsValue({
      domain: 'E-Commerce',
      expectedBudget: 75000,
      teamSize: 12,
      complexity: 'Medium',
      mobile: 1,
      desktop: 0,
      web: 1,
      iot: 0,
      risk: 2
    });
    message.info('Demo data filled! Click "Generate Forecast" to see results.');
  };

  const resetForm = () => {
    form.resetFields();
    setResult(null);
  };

  const exportToPDF = () => {
    const input = document.getElementById('forecast-content');
    html2canvas(input, {
      backgroundColor: '#F5F5F5',
      scale: 2
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('budget-forecast.pdf');
    });
  };

  const getRiskColor = (variance) => {
    const abs = Math.abs(variance);
    if (abs < 10) return '#96BD68'; // Green
    if (abs < 25) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const chartData = result ? [
    { name: 'Expected', value: result.expected_budget },
    { name: 'Predicted', value: result.predicted_budget }
  ] : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar w-64 min-h-screen p-6 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img src={logoImage} alt="Budget Forecasting Logo" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
        </div>



        {/* Navigation 
        /*<nav className="flex-1">
          <div className="w-full text-left px-4 py-3 mb-2 rounded-lg bg-primary-dark/20 text-white">
            New Forecast
          </div>
          <div className="w-full text-left px-4 py-3 mb-2 rounded-lg hover:bg-primary-dark/20 transition-colors text-gray-300 hover:text-white cursor-pointer">
            History
          </div>
          <div className="w-full text-left px-4 py-3 mb-2 rounded-lg hover:bg-primary-dark/20 transition-colors text-gray-300 hover:text-white cursor-pointer">
            Settings
          </div>
        </nav>*/}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>© 2026 Budget Forecast</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8" id="forecast-content">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <DollarOutlined className="text-primary" />
              Budget Forecasting
            </h1>
            <p className="text-gray-600">Advanced Machine Learning for Project Cost Prediction</p>
          </div>

          {/* Input Form */}
          <Card className="mb-8 shadow-lg rounded-2xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <ThunderboltOutlined className="text-primary" />
              Project Parameters
            </h2>
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item name="domain" label="Project Domain" rules={[{ required: true }]}>
                    <Select placeholder="Select domain" size="large">
                      <Option value="E-Commerce">E-Commerce</Option>
                      <Option value="Finance">Finance</Option>
                      <Option value="Health">Health</Option>
                      <Option value="Education">Education</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="expectedBudget" label="Expected Budget ($)" rules={[{ required: true }]}>
                    <Input type="number" placeholder="e.g. 50000" size="large" prefix="$" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item name="teamSize" label="Team Size" rules={[{ required: true }]}>
                    <Input type="number" placeholder="e.g. 8" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="complexity" label="Complexity Level" rules={[{ required: true }]}>
                    <Select placeholder="Select complexity" size="large">
                      <Option value="Low">Low</Option>
                      <Option value="Medium">Medium</Option>
                      <Option value="High">High</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col xs={12} md={6}>
                  <Form.Item name="mobile" label="Mobile App" rules={[{ required: true }]}>
                    <Select size="large">
                      <Option value={1}>Yes</Option>
                      <Option value={0}>No</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="desktop" label="Desktop App" rules={[{ required: true }]}>
                    <Select size="large">
                      <Option value={1}>Yes</Option>
                      <Option value={0}>No</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="web" label="Web App" rules={[{ required: true }]}>
                    <Select size="large">
                      <Option value={1}>Yes</Option>
                      <Option value={0}>No</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="iot" label="IoT Features" rules={[{ required: true }]}>
                    <Select size="large">
                      <Option value={1}>Yes</Option>
                      <Option value={0}>No</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="risk" label="Risk Assessment" rules={[{ required: true }]}>
                <Select placeholder="Select risk level" size="large">
                  <Option value={1}>Low Risk</Option>
                  <Option value={2}>Medium Risk</Option>
                  <Option value={3}>High Risk</Option>
                </Select>
              </Form.Item>

              <Row gutter={16} style={{ marginTop: 20 }}>
                <Col span={12}>
                  <Button onClick={fillDemoData} size="large" block icon={<ThunderboltOutlined />}>
                    Demo Fill
                  </Button>
                </Col>
                <Col span={12}>
                  <Button onClick={resetForm} size="large" block icon={<ReloadOutlined />}>
                    Reset
                  </Button>
                </Col>
              </Row>

              <div style={{ marginTop: 20 }}>
                <Button type="primary" htmlType="submit" loading={loading} size="large" block icon={<DollarOutlined />} className="btn-primary">
                  GENERATE FORECAST
                </Button>
              </div>
            </Form>
          </Card>

          {loading && (
            <div className="text-center py-12">
              <Spin size="large" />
              <p className="mt-4 text-gray-600">Running XGBoost Model & Generating AI Insights...</p>
            </div>
          )}

          {result && !result.error && (
            <div ref={resultsRef}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Forecast Results</h2>
                <p className="text-gray-600">Based on {result.features_used?.platforms} platforms and risk level {result.features_used?.risk}</p>
              </div>

              <Row gutter={24} className="mb-6">
                <Col xs={24} md={8}>
                  <Card className="shadow-lg rounded-2xl">
                    <Statistic
                      title="Expected Budget"
                      value={result.expected_budget}
                      precision={2}
                      prefix="$"
                      valueStyle={{ color: '#6B7280' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="shadow-lg rounded-2xl card-green">
                    <Statistic
                      title={<span style={{ color: 'white' }}>Predicted Actual Budget</span>}
                      value={result.predicted_budget}
                      precision={2}
                      prefix="$"
                      valueStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="shadow-lg rounded-2xl">
                    <Statistic
                      title="Variance"
                      value={Math.abs(result.variance)}
                      precision={2}
                      prefix={result.variance >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      suffix={`(${result.variance_percent > 0 ? '+' : ''}${result.variance_percent.toFixed(1)}%)`}
                      valueStyle={{ color: getRiskColor(result.variance_percent) }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={24} className="mb-6">
                <Col xs={24} md={14}>
                  <Card className="shadow-lg rounded-2xl">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Budget Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Budget']}
                        />
                        <Legend />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#6B7280' : getRiskColor(result.variance_percent)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                <Col xs={24} md={10}>
                  <Card className="shadow-lg rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800">Risk Assessment</h3>
                      <Tag
                        color={result.budget_risk === 'Low Risk' ? '#96BD68' : result.budget_risk === 'Medium Risk' ? '#f59e0b' : '#ef4444'}
                        style={{ fontSize: '14px', padding: '4px 12px', border: 'none' }}
                      >
                        {result.budget_risk.toUpperCase()}
                      </Tag>
                    </div>
                    <div className="text-center py-4">
                      <Progress
                        type="dashboard"
                        percent={Math.min(Math.abs(result.variance_percent), 100)}
                        strokeColor={getRiskColor(result.variance_percent)}
                        format={percent => `${percent.toFixed(1)}%`}
                        width={180}
                      />
                      <p className="text-gray-600 mt-2">Budget Variance</p>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card className="shadow-lg rounded-2xl mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ThunderboltOutlined className="text-primary" />
                  AI Analysis & Recommendations
                </h3>
                <div className="text-gray-700 space-y-2">
                  {result.ai_insights.split('\n').map((line, idx) => (
                    <p key={idx} dangerouslySetInnerHTML={{
                      __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                    }} />
                  ))}
                </div>
              </Card>

              <Button type="primary" onClick={exportToPDF} size="large" block className="btn-primary">
                Download PDF Report
              </Button>
            </div>
          )}

          {result && result.error && (
            <Card className="mt-8 bg-red-50 border-red-200">
              <div className="text-center text-red-600">
                <WarningOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
                <h3 className="text-xl font-semibold mb-2">Prediction Failed</h3>
                <p>{result.error}</p>
                <p>Please ensure the backend server is running on port 5002.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
