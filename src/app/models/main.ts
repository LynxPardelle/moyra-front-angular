export class Main {
  constructor(
    public _id: string,
    public desc: string,
    public logo: any,
    public mainImg: any,
    public FB: string,
    public whatsApp: string,
    public twitter: string,
    public mail: string,
    public linkedIn: string,
    public phoneNumber: string,
    public key: string,
    public keyOld: string,
    public errorMessage: string,
    public seoTags: string,
    public seoImg: any
  ) {}
}

export class Equip {
  constructor(
    public _id: string,
    public name: string,
    public photo: any,
    public desc: string,
    public order: number
  ) {}
}
