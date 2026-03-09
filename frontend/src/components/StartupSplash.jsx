import loginImage from "../assets/user/signin.png";

const StartupSplash = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fbf2] to-[#edf4e4] px-6 py-10 lg:px-24">
      <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-3xl bg-white p-6 shadow-xl lg:grid-cols-2 lg:p-10">
        <img
          className="h-full w-full rounded-2xl object-cover"
          src={loginImage}
          alt="WeeNet loading"
        />
        <div className="w-full">
          <div className="mb-7">
            <h1 className="text-4xl font-extrabold text-[#2f4c1a]">WeeNet Project Management</h1>
            <p className="mt-2 text-[#5f6f52]">Preparing your workspace...</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8f1dc]">
            <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-[#4D6F2F]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupSplash;
