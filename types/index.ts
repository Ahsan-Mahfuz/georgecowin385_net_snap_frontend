export type UserRole = 'ADMIN' | 'FINANCE' | 'OPERATIONS' | 'PRODUCTION' | 'TALENT_MANAGER' | 'SUPER_ADMIN';

export interface User {
  email: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export interface SidebarItem {
  title: string;
  path: string;
}

export interface SidebarConfig {
  [key: string]: SidebarItem[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface LayoutState {
  isMobileSidebarOpen: boolean;
}