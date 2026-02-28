export interface StorageProvider {
  readonly bucket: string;

  // อัพโหลดไฟล์ไปยัง storage
  putObject(bucket: string, key: string, body: Buffer, size?: number, metadata?: Record<string, string>): Promise<void>;

  // ลบไฟล์จาก storage
  deleteObject(bucket: string, key: string): Promise<void>;

  // สร้าง URL สาธารณะสำหรับ CDN (ไม่มีวันหมดอายุ)
  buildPublicUrl(bucket: string, key: string): string;

  // คืน URL สำหรับให้ client อัพโหลดไฟล์โดยตรงไปยัง storage (สำหรับไฟล์ขนาดใหญ่)
  presignPut(bucket: string, key: string, contentType: string, expiresIn: number): Promise<string>;
}
