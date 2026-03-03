import React, { useState } from "react";
import {
  HomeOutlined,
  UserAddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme } from "antd";
import { Outlet, Link, useNavigate } from "react-router-dom";

const { Header, Sider, Content, Footer } = Layout;

import { LuUsers } from "react-icons/lu";
import { GrCircleInformation } from "react-icons/gr";
import { TbUsersGroup, TbTopologyComplex } from "react-icons/tb";
import { RiSkull2Fill, RiShoppingBasket2Fill } from "react-icons/ri";
import { GrDocumentPerformance } from "react-icons/gr";
import logo from "../assets/logoIcon.jpeg";
import { CgProfile } from "react-icons/cg";
import Swal from "sweetalert2";
import { MdOutlineAddChart } from "react-icons/md";
import { BsGearWideConnected } from "react-icons/bs";

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const menuItems = [
    { key: "1", icon: <HomeOutlined />, label: <Link to="/requirement">Requirements</Link> },
    { key: "2", icon: <UserAddOutlined />, label: <Link to="/add-employee">Add Employee</Link> },
    { key: "3", icon: <LuUsers />, label: <Link to="/view-employee">View Employees</Link> },
    { key: "4", icon: <GrDocumentPerformance />, label: <Link to="/view-KPI">View KPI</Link> },
    { key: "5", icon: <GrCircleInformation />, label: <Link to="/skill">Skill Info</Link> },
    { key: "6", icon: <MdOutlineAddChart />, label: <Link to="/crud">Add Skills</Link> },
    { key: "7", icon: <TbUsersGroup />, label: <Link to="/team">Team</Link> },
    { key: "8", icon: <TbTopologyComplex />, label: <Link to="/complexity">Complexity</Link> },
    { key: "9", icon: <RiShoppingBasket2Fill />, label: <Link to="/projects">Project Details</Link> },
    { key: "10", icon: <RiSkull2Fill />, label: <Link to="/risk-type">Risk Type</Link> },
    { key: "11", icon: <BsGearWideConnected />, label: <Link to="/sdlc">SDLC</Link> },
  ];

  const logout = () => {
    localStorage.removeItem("SearchPayload");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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

          <Menu theme="dark" mode="inline" style={{ flex: 1 }} items={menuItems} />

          <Footer
            style={{
              textAlign: "center",
              backgroundColor: "#00152a",
              color: "#white",
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
                {Boolean(localStorage.getItem("token")) ? (
                  <Button
                    type="primary"
                    className="mt-5 cursor-pointer"
                    style={{ backgroundColor: "#4D6F2F"}}
                    onClick={logout}
                  >
                    Log Out
                  </Button>
                ) : (
                  <div className="flex flex-row gap-3">
                    <Button
                      type="primary"
                      className="mt-5 cursor-pointer"
                      onClick={() => navigate("/login")}
                    >
                      Login
                    </Button>
                    <Button
                      type="primary"
                      className="mt-5 cursor-pointer"
                      onClick={() => navigate("/register")}
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
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 64, height: 64 }}
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
  );
};

export default AppLayout;
