import cv2
import numpy as np
from PIL import Image
import argparse
import os


def remove_watermark_bottom_corner(image, corner='bottom_right', 
                                     watermark_height_ratio=0.12, 
                                     watermark_width_ratio=0.25):
    """
    حذف واترمارک از گوشه پایین تصویر با استفاده از inpainting
    
    Parameters:
        image: تصویر ورودی (numpy array)
        corner: گوشه واترمارک ('bottom_right' یا 'bottom_left')
        watermark_height_ratio: نسبت ارتفاع واترمارک به کل تصویر
        watermark_width_ratio: نسبت عرض واترمارک به کل تصویر
    """
    h, w = image.shape[:2]
    
    # محاسبه ابعاد ناحیه واترمارک
    wm_h = int(h * watermark_height_ratio)
    wm_w = int(w * watermark_width_ratio)
    
    # تعیین مختصات ناحیه واترمارک
    if corner == 'bottom_right':
        y_start = h - wm_h
        y_end = h
        x_start = w - wm_w
        x_end = w
    elif corner == 'bottom_left':
        y_start = h - wm_h
        y_end = h
        x_start = 0
        x_end = wm_w
    elif corner == 'bottom_center':
        y_start = h - wm_h
        y_end = h
        x_start = (w - wm_w) // 2
        x_end = x_start + wm_w
    else:
        raise ValueError("corner باید 'bottom_right'، 'bottom_left' یا 'bottom_center' باشد")
    
    # ---- روش ۱: تشخیص خودکار واترمارک ----
    # برش ناحیه مشکوک
    roi = image[y_start:y_end, x_start:x_end]
    
    # تبدیل به خاکستری
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    
    # تشخیص لبه‌ها و نواحی متفاوت (واترمارک معمولاً نیمه‌شفاف است)
    # استفاده از آستانه‌گذاری تطبیقی
    thresh = cv2.adaptiveThreshold(
        gray_roi, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 21, 5
    )
    
    # اعمال عملیات مورفولوژی برای بهبود ماسک
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.dilate(thresh, kernel, iterations=3)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # ساخت ماسک کامل به اندازه تصویر اصلی
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y_start:y_end, x_start:x_end] = thresh
    
    # اعمال inpainting
    result = cv2.inpaint(image, mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)
    
    return result, mask


def remove_watermark_full_region(image, corner='bottom_right',
                                  watermark_height_ratio=0.12,
                                  watermark_width_ratio=0.25):
    """
    حذف کامل ناحیه واترمارک (بدون تشخیص خودکار - کل ناحیه را پاک می‌کند)
    """
    h, w = image.shape[:2]
    
    wm_h = int(h * watermark_height_ratio)
    wm_w = int(w * watermark_width_ratio)
    
    if corner == 'bottom_right':
        y_start, y_end = h - wm_h, h
        x_start, x_end = w - wm_w, w
    elif corner == 'bottom_left':
        y_start, y_end = h - wm_h, h
        x_start, x_end = 0, wm_w
    else:
        y_start, y_end = h - wm_h, h
        x_start, x_end = (w - wm_w) // 2, (w + wm_w) // 2
    
    # ساخت ماسک با لبه‌های نرم (gradient)
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y_start:y_end, x_start:x_end] = 255
    
    # نرم کردن لبه‌های ماسک
    mask = cv2.GaussianBlur(mask, (21, 21), 10)
    
    result = cv2.inpaint(image, mask, inpaintRadius=10, flags=cv2.INPAINT_TELEA)
    
    return result, mask


def resize_image(image, target_width=2048):
    """
    تغییر سایز تصویر با حفظ نسبت ابعاد
    """
    h, w = image.shape[:2]
    ratio = target_width / w
    target_height = int(h * ratio)
    
    # استفاده از LANCZOS برای کیفیت بالا
    resized = cv2.resize(image, (target_width, target_height), 
                          interpolation=cv2.INTER_LANCZOS4)
    
    print(f"  📐 سایز اصلی: {w}x{h}")
    print(f"  📐 سایز جدید: {target_width}x{target_height}")
    print(f"  📐 نسبت بزرگنمایی: {ratio:.2f}x")
    
    return resized


def process_image(input_path, output_path=None, 
                   target_width=2048,
                   corner='bottom_right',
                   wm_height_ratio=0.12,
                   wm_width_ratio=0.25,
                   method='auto',
                   save_mask=False):
    """
    پردازش کامل تصویر: حذف واترمارک + تغییر سایز
    """
    # بررسی وجود فایل
    if not os.path.exists(input_path):
        print(f"❌ فایل '{input_path}' یافت نشد!")
        return
    
    # خواندن تصویر
    image = cv2.imread(input_path)
    if image is None:
        print(f"❌ خطا در خواندن فایل '{input_path}'")
        return
    
    print(f"🖼️  فایل ورودی: {input_path}")
    print(f"  📏 ابعاد اصلی: {image.shape[1]}x{image.shape[0]}")
    
    # ---- مرحله ۱: حذف واترمارک ----
    print("\n🔧 مرحله ۱: حذف واترمارک...")
    
    if method == 'auto':
        result, mask = remove_watermark_bottom_corner(
            image, corner, wm_height_ratio, wm_width_ratio
        )
        print("  ✅ واترمارک با روش تشخیص خودکار حذف شد")
    elif method == 'full':
        result, mask = remove_watermark_full_region(
            image, corner, wm_height_ratio, wm_width_ratio
        )
        print("  ✅ ناحیه واترمارک به طور کامل حذف شد")
    
    # ذخیره ماسک (اختیاری)
    if save_mask:
        mask_path = input_path.rsplit('.', 1)[0] + '_mask.png'
        cv2.imwrite(mask_path, mask)
        print(f"  🎭 ماسک ذخیره شد: {mask_path}")
    
    # ---- مرحله ۲: تغییر سایز ----
    print(f"\n🔧 مرحله ۲: تغییر عرض به {target_width} پیکسل...")
    result = resize_image(result, target_width)
    
    # ---- ذخیره نتیجه ----
    if output_path is None:
        name, ext = os.path.splitext(input_path)
        output_path = f"{name}_processed{ext}"
    
    # ذخیره با کیفیت بالا
    ext = os.path.splitext(output_path)[1].lower()
    if ext in ['.jpg', '.jpeg']:
        cv2.imwrite(output_path, result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    elif ext == '.png':
        cv2.imwrite(output_path, result, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    else:
        cv2.imwrite(output_path, result)
    
    print(f"\n✅ فایل خروجی ذخیره شد: {output_path}")
    print("🎉 پردازش با موفقیت انجام شد!")
    
    return result


def interactive_mode():
    """
    حالت تعاملی برای تنظیم دقیق ناحیه واترمارک
    """
    input_path = input("📁 مسیر فایل تصویر را وارد کنید: ").strip().strip('"')
    
    if not os.path.exists(input_path):
        print(f"❌ فایل یافت نشد!")
        return
    
    image = cv2.imread(input_path)
    h, w = image.shape[:2]
    print(f"📏 ابعاد تصویر: {w}x{h}")
    
    print("\n📍 واترمارک در کدام گوشه است؟")
    print("  1. پایین راست (پیش‌فرض)")
    print("  2. پایین چپ")
    print("  3. پایین وسط")
    
    choice = input("انتخاب (1/2/3): ").strip() or '1'
    corners = {'1': 'bottom_right', '2': 'bottom_left', '3': 'bottom_center'}
    corner = corners.get(choice, 'bottom_right')
    
    print("\n📐 اندازه تقریبی واترمارک:")
    wm_h = input(f"  ارتفاع واترمارک (پیکسل، پیش‌فرض {int(h*0.12)}): ").strip()
    wm_w = input(f"  عرض واترمارک (پیکسل، پیش‌فرض {int(w*0.25)}): ").strip()
    
    wm_height_ratio = int(wm_h) / h if wm_h else 0.12
    wm_width_ratio = int(wm_w) / w if wm_w else 0.25
    
    print("\n🔧 روش حذف واترمارک:")
    print("  1. تشخیص خودکار (پیش‌فرض)")
    print("  2. حذف کامل ناحیه")
    
    method_choice = input("انتخاب (1/2): ").strip() or '1'
    method = 'auto' if method_choice == '1' else 'full'
    
    target_width = input(f"\n📐 عرض مورد نظر (پیش‌فرض 2048): ").strip()
    target_width = int(target_width) if target_width else 2048
    
    output_path = input("\n📁 مسیر فایل خروجی (Enter برای پیش‌فرض): ").strip().strip('"')
    output_path = output_path if output_path else None
    
    print("\n" + "="*50)
    process_image(
        input_path, output_path, target_width,
        corner, wm_height_ratio, wm_width_ratio, 
        method, save_mask=True
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="حذف واترمارک و تغییر سایز تصویر",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
مثال‌های استفاده:
  python watermark_remover.py image.jpg
  python watermark_remover.py image.jpg -o output.jpg
  python watermark_remover.py image.jpg --corner bottom_left
  python watermark_remover.py image.jpg --wm-height 0.15 --wm-width 0.3
  python watermark_remover.py image.jpg --method full --width 2048
  python watermark_remover.py --interactive
        """
    )
    
    parser.add_argument('input', nargs='?', help='مسیر فایل ورودی')
    parser.add_argument('-o', '--output', help='مسیر فایل خروجی')
    parser.add_argument('-w', '--width', type=int, default=2048,
                        help='عرض مورد نظر (پیش‌فرض: 2048)')
    parser.add_argument('--corner', default='bottom_right',
                        choices=['bottom_right', 'bottom_left', 'bottom_center'],
                        help='موقعیت واترمارک')
    parser.add_argument('--wm-height', type=float, default=0.12,
                        help='نسبت ارتفاع واترمارک (0-1، پیش‌فرض: 0.12)')
    parser.add_argument('--wm-width', type=float, default=0.25,
                        help='نسبت عرض واترمارک (0-1، پیش‌فرض: 0.25)')
    parser.add_argument('--method', default='auto', choices=['auto', 'full'],
                        help='روش حذف واترمارک')
    parser.add_argument('--save-mask', action='store_true',
                        help='ذخیره ماسک واترمارک')
    parser.add_argument('--interactive', '-i', action='store_true',
                        help='حالت تعاملی')
    
    args = parser.parse_args()
    
    if args.interactive:
        interactive_mode()
    elif args.input:
        process_image(
            args.input, args.output, args.width,
            args.corner, args.wm_height, args.wm_width,
            args.method, args.save_mask
        )
    else:
        # اگر هیچ آرگومانی داده نشد، حالت تعاملی
        interactive_mode()
