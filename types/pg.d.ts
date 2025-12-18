declare module "pg" {
  export type ClientConfig = {
    connectionString?: string;
  };

  export class Client {
    constructor(config?: ClientConfig);
    connect(): Promise<void>;
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
