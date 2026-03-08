export type Role = 'Admin' | 'DepartmentManager' | 'ProjectManager' | 'Employee';

export interface User {
  id: number;
  username: string;
  displayName: string;
  isActive: boolean;
  employeeId: number | null;
  employeeName: string | null;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserCreateDto {
  username: string;
  password: string;
  displayName: string;
  employeeId?: number | null;
  roles?: string[];
}

export interface UserUpdateDto {
  displayName: string;
  employeeId?: number | null;
  isActive: boolean;
  roles?: string[];
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
