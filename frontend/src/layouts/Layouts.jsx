import React, { useState } from "react";
import {
  HomeOutlined,
  UserAddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExperimentOutlined,
  BulbOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme, ConfigProvider } from "antd";
import { Outlet, Link } from "react-router-dom";
const { Header, Sider, Content, Footer } = Layout;
import { GrCircleInformation } from "react-icons/gr";
import { TbUsersGroup, TbTopologyComplex } from "react-icons/tb";
import { RiSkull2Fill, RiShoppingBasket2Fill } from "react-icons/ri";
import { GrDocumentPerformance } from "react-icons/gr";
import { CgProfile } from "react-icons/cg";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdOutlineAddChart } from "react-icons/md";
import { BsGearWideConnected } from "react-icons/bs";
import { LuUsers } from 'react-icons/lu'
import logo from "../assets/logoIcon.png";
const greenColors = {
  lightGreen: "#B0D287",
  mediumLightGreen: "#96BD68",
  mediumGreen: "#6A953F",
  darkGreen: "#4D6F2F",
};
const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("SearchPayload");
    localStorage.removeItem("user");
    localStorage.removeItem("team");
    localStorage.removeItem("projects");
    Swal.fire({
      icon: "success",
      title: "",
      text: "Logged Out",
    });
    navigate("/login");
  };
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: greenColors.mediumGreen,
          colorBgBase: "#ffffff",
        },
        components: {
          Button: {
            colorPrimary: greenColors.mediumGreen,
            colorPrimaryHover: greenColors.mediumLightGreen,
            colorPrimaryActive: greenColors.darkGreen,
          },
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <img src={logo} alt="logo" />

            <Menu theme="dark" mode="inline" style={{ flex: 1 }}>
              <Menu.Item key="1" icon={<HomeOutlined />}>
                <Link to="/requirement">Requirements</Link>
              </Menu.Item>
              <Menu.Item key="2" icon={<UserAddOutlined />}>
                <Link to="/add-employee">Add Employee</Link>
              </Menu.Item>
              <Menu.Item key="3" icon={<LuUsers />}>
                <Link to="/view-employee">View Employees</Link>
              </Menu.Item>
              {/* <Menu.Item key="4" icon={<GrDocumentPerformance />}>
              <Link to="/view-KPI">View KPI</Link>
            </Menu.Item> */}
              <Menu.Item key="5" icon={<GrCircleInformation />}>
                <Link to="/skill">Skill Info</Link>
              </Menu.Item>
              <Menu.Item key="6" icon={<MdOutlineAddChart />}>
                <Link to="/crud">Add Skills</Link>
              </Menu.Item>
              <Menu.Item key="7" icon={<TbUsersGroup />}>
                <Link to="/team">Team</Link>
              </Menu.Item>
              <Menu.Item key="8" icon={<TbTopologyComplex />}>
                <Link to="/complexity">Complexity</Link>
              </Menu.Item>
              <Menu.Item key="9" icon={<RiShoppingBasket2Fill />}>
                <Link to="/projects">Project Details</Link>
              </Menu.Item>
              <Menu.Item key="10" icon={<RiSkull2Fill />}>
                <Link to="/risk-type">Risk Type</Link>
              </Menu.Item>
              <Menu.Item key="11" icon={<BsGearWideConnected />}>
                <Link to="/sdlc">SDLC</Link>
              </Menu.Item>
              <Menu.Item key="12" icon={<ExperimentOutlined />}>
                <Link to="/ml-prediction">ML KPI Prediction</Link>
              </Menu.Item>
              <Menu.Item key="13" icon={<BulbOutlined />}>
                <Link to="/ml-recommendations">AI Career Advisor</Link>
              </Menu.Item>
              <Menu.Item key="14" icon={<RobotOutlined />}>
                <Link to="/ml-team">AI Team Analysis</Link>
              </Menu.Item>
            </Menu>
            <Footer
              style={{
                textAlign: "center",
                backgroundColor: "#001529",
                color: "#ffffff",
                padding: 10,
              }}
            >
              <div>
                <div className="flex justify-center items-center flex-row gap-3">
                  <div>
                    <CgProfile />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-md">Admin</div>
                    <div className="text-[10px]">Project Manager</div>
                  </div>
                </div>
                <div>
                  {localStorage.getItem("user") === "true" ? (
                    <Button
                      type="primary"
                      className="mt-5 cursor-pointer"
                      onClick={logout}
                    >
                      Log Out
                    </Button>
                  ) : (
                    <div className="flex flex-row gap-3">
                      <Button
                        type="primary"
                        className="mt-5 cursor-pointer"
                        onClick={() => {
                          navigate("/login");
                        }}
                      >
                        Login
                      </Button>
                      <Button
                        type="primary"
                        className="mt-5 cursor-pointer"
                        onClick={() => {
                          navigate("/register");
                        }}
                      >
                        Register
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Footer>
          </div>
        </Sider>
        <Layout>
          <Header
            style={{
              padding: 0,
              background: colorBgContainer,
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "16px",
                width: 64,
                height: 64,
              }}
            />
          </Header>
          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: "80vh",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>

  );
};

export default AppLayout;
