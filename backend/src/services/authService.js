import jwt from "jsonwebtoken";

const buildDemoUsers = () => {
  return [
    {
      id: "1",
      name: "Atomos Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      permissions: [
        "dashboard:view",
        "tickets:view",
        "satisfaction:view",
        "rma:view",
        "agents:view",
        "rush-rma:view",
        "social:view",
        "admin:view",
      ],
    },
    {
      id: "2",
      name: "Atomos Viewer",
      email: process.env.VIEWER_EMAIL,
      password: process.env.VIEWER_PASSWORD,
      role: "viewer",
      permissions: [
        "dashboard:view",
        "tickets:view",
        "satisfaction:view",
        "rma:view",
        "agents:view",
        "rush-rma:view",
        "social:view",
      ],
    },
  ];
};

export async function loginUser({ email, password }) {
  const users = buildDemoUsers();

  const user = users.find(
    (item) => item.email?.toLowerCase() === email?.toLowerCase()
  );

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = password === user.password;

  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const { password: hiddenPassword, ...safeUser } = user;

  return {
    token,
    user: safeUser,
  };
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
