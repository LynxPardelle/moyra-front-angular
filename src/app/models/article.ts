export class Article {
  constructor(
    public title: string,
    public mainImg: any,
    public intro: string,
    public outro: string,
    public sections: any[],
    public tags: string,
    public urltitle: string,
    public create_at: Date
  ) {}
}

export class ArticleSection {
  constructor(
    public title: string,
    public text: string,
    public mainFile: any,
    public files: any[],
    public order: number,
    public insertions: string[],
    public article: string
  ) {}
}
