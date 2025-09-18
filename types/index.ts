// Tipos para o backend da aplicação de gestão financeira

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  premium_until?: Date | null;
  stripe_customer_id?: string | null;
}

export interface Category {
  id: number;
  name: string;
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Income {
  id: number;
  description: string;
  value: number;
  date: Date;
  user_id: number;
  category_id?: number | null;
  isFixed: boolean;
  recurrenceType?: 'monthly' | 'yearly' | null;
  startDate?: Date | null;
  endDate?: Date | null;
  fixed_income_id?: number | null;
  created_at: Date;
  updated_at: Date;
  category?: Category | null;
}

export interface Expense {
  id: number;
  description: string;
  value: number;
  date: Date;
  user_id: number;
  category_id?: number | null;
  isFixed: boolean;
  recurrenceType?: 'monthly' | 'yearly' | null;
  startDate?: Date | null;
  endDate?: Date | null;
  fixed_expense_id?: number | null;
  created_at: Date;
  updated_at: Date;
  category?: Category | null;
}

export interface FinancialGoal {
  id: number;
  name: string;
  description?: string | null;
  target: number;
  saved: number;
  deadline?: Date | null;
  status: 'active' | 'completed' | 'paused';
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface DashboardData {
  monthlyIncome: number;
  monthlyExpense: number;
  saldo: number;
  monthlyData: MonthlyDataPoint[];
  categoryData: CategoryDataPoint[];
  userCreatedAt: Date;
  userCreatedYear: number;
  userCreatedMonth: number;
  currentMonth: number;
  currentYear: number;
}

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

export interface CacheConfig {
  max: number;
  ttl: number;
}

export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  month?: number;
  year?: number;
  fixed?: boolean;
  category_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
  code?: string;
  timestamp?: string;
}

// Tipos para validação de entrada
export interface CreateIncomeRequest {
  description: string;
  value: number;
  date: string;
  category_id?: number;
  isFixed?: boolean;
  recurrenceType?: 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  fixed_income_id?: number;
}

export interface CreateExpenseRequest {
  description: string;
  value: number;
  date: string;
  category_id?: number;
  isFixed?: boolean;
  recurrenceType?: 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  fixed_expense_id?: number;
}

export interface UpdateIncomeRequest {
  description?: string;
  value?: number;
  date?: string;
  category_id?: number;
}

export interface UpdateExpenseRequest {
  description?: string;
  value?: number;
  date?: string;
  category_id?: number;
}

export interface CreateGoalRequest {
  name: string;
  description?: string;
  target: number;
  deadline?: string;
}

export interface UpdateGoalRequest {
  name?: string;
  description?: string;
  target?: number;
  deadline?: string;
  status?: 'active' | 'completed' | 'paused';
}

export interface AddValueToGoalRequest {
  amount: number;
}

// Tipos para cache
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Tipos para middleware
export interface AuthMiddleware {
  (req: AuthRequest, res: Response, next: NextFunction): void;
}

// Tipos para utilitários
export interface DateRange {
  start: Date;
  end: Date;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  total_amount: number;
  transaction_count: number;
}

// Tipos para relatórios
export interface MonthlyReport {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  categories: CategorySummary[];
}

export interface YearlyReport {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthlyData: MonthlyReport[];
}

// Tipos para exportação
export interface ExportData {
  incomes: Income[];
  expenses: Expense[];
  categories: Category[];
  goals: FinancialGoal[];
  period: {
    start: Date;
    end: Date;
  };
}

// Tipos para configuração
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  ssl?: boolean;
}

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  memory?: {
    max: number;
    ttl: number;
  };
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  jwtSecret: string;
  database: DatabaseConfig;
  cache: CacheConfig;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}
