export class Publication {
  constructor(
    public title: string,
    public text: string,
    public insertions: string[],
    public youtube: string,
    public mainFile: any,
    public files: any[],
    public urltitle: string,
    public create_at: Date,
    public _id: string = '',
    public id: string = ''
  ) {}
}
