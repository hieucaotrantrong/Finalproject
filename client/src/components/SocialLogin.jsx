import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

function SocialLogin() {
  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {

      sessionStorage.setItem("token", token);

      const user = jwtDecode(token);

      sessionStorage.setItem("user", JSON.stringify(user));

      if (user?.email) {
        sessionStorage.setItem("userEmail", user.email);
      }

      window.location.href = "/home";

    } else {

      window.location.href = "/login";

    }

  }, []);

  return <div>Đang đăng nhập...</div>;
}

export default SocialLogin;