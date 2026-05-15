function userToResponse(user) {
  return {
    id: user.id,
    email: user.email.value,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

module.exports = { userToResponse };
