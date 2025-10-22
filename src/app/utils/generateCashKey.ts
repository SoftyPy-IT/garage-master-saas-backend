

export const getUserPermissionsCacheKey = (tenantDomain: string, userId: string) =>
  `permission:${tenantDomain}:user:${userId}:permissions`;

export const getSinglePermissionCacheKey = (tenantDomain: string, id: string) =>
  `permission:${tenantDomain}:single:${id}`;

export const getAllPermissionsCacheKey = (tenantDomain: string, options: any) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', role = '', user = '', searchTerm = '' } = options;
  return `permission:${tenantDomain}:all:${page}:${limit}:${sortBy}:${sortOrder}:${role}:${user}:${searchTerm}`;
};
