export class User {
  constructor(
    public name: string,
    public email: string,
    public role: string,
    public password: string,
    public passwordOld: string,
    public create_at: Date
  ) {}
}
