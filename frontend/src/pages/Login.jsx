import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import login from "../assets/user/signin.png";
import axios from "../apis/axiosInstance";
import { Form, Input } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await axios.post("login", {
        email: values.email,
        password: values.password,
      });
      if (res.data.status !== 200 || !res.data.token) {
        throw new Error(res?.data?.response || "Invalid User");
      }
      Swal.fire({
        icon: "success",
        title: "",
        text: res.data.response,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user || { email: values.email }));
      navigate("/requirement");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err?.response?.data?.response || err?.message || "Login failed",
      });
    }
  };

  const inputStyle =
    "w-full h-12 rounded-xl border border-[#d9e8cc] px-3 focus:border-[#4D6F2F] focus:shadow-none";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fbf2] to-[#edf4e4] px-6 py-10 lg:px-24">
      <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-3xl bg-white p-6 shadow-xl lg:grid-cols-2 lg:p-10">
        <img
          className="h-full w-full rounded-2xl object-cover"
          src={login}
          alt="Login illustration"
        />
        <div className="w-full">
          <div className="mb-7">
            <h1 className="text-4xl font-extrabold text-[#2f4c1a]">Welcome Back</h1>
            <p className="mt-2 text-[#5f6f52]">Login to continue with WeeNet Project Management.</p>
          </div>
          <Form name="basic" onFinish={onFinish} autoComplete="off" layout="vertical">
            <div className="mt-2">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  {
                    required: true,
                    message: "Please input your email!",
                  },
                  {
                    type: "email",
                    message: "The input is not valid E-mail!",
                  },
                ]}
                hasFeedback
              >
                <Input
                  prefix={<MailOutlined className="site-form-item-icon" />}
                  placeholder="you@example.com"
                  className={inputStyle}
                />
              </Form.Item>
            </div>

            <div className="mt-1">
              <Form.Item
                label="Password"
                name="password"
                rules={[
                  {
                    required: true,
                    message: "Please input your password!",
                  },
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined className="site-form-item-icon" />}
                  placeholder="Password"
                  className={inputStyle}
                />
              </Form.Item>
            </div>

            <div className="mt-2">
              <Form.Item>
                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[#4D6F2F] font-semibold text-white transition hover:bg-[#3f5e28]"
                >
                  Login
                </button>
              </Form.Item>
            </div>

            <div className="text-sm text-[#5f6f52]">
              <Link to="/register" className="text-[#4D6F2F] hover:underline">
                Not a member? Register
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
