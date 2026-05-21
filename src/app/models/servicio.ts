export class Servicio {
  constructor(
    public _id: string,
    public title: string,
    public mainImg: any,
    public desc: string,
    public tags: string,
    public urltitle: string,
    public create_at: Date,
    public seoTitle: string = '',
    public seoDescription: string = '',
    public seoKeywords: string = ''
  ) {}
}
