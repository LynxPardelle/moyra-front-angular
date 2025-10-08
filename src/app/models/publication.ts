export class Publication {
  constructor(
    public title: string,
    public text: string,
    public insertions: string[],
    public youtube: string,
    public mainFile: any,
    public files: any[],
    public create_at: Date
  ) {}
}
