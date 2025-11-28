export const me = (req, res) => {
  const { _id, name, email, role } = req.user;
  res.json({ id: _id.toString(), name, email, role });
};

