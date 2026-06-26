/**
 * Arabic Tafqeet (Number to Words) Engine
 * Supported Currencies: USD, SAR, YER
 */

const table_units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
const table_teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const table_tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const table_hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

function convertGroup(num) {
  let words = [];
  
  // Hundreds
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    words.push(table_hundreds[hundreds]);
  }
  
  // Tens and Units
  const remainder = num % 100;
  if (remainder > 0) {
    if (remainder < 10) {
      words.push(table_units[remainder]);
    } else if (remainder < 20) {
      words.push(table_teens[remainder - 10]);
    } else {
      const units = remainder % 10;
      const tens = Math.floor(remainder / 10);
      
      if (units > 0) {
        words.push(table_units[units] + " و" + table_tens[tens]);
      } else {
        words.push(table_tens[tens]);
      }
    }
  }
  
  return words.join(" و");
}

function convertNumberToWords(num) {
  if (num === 0) return "صفر";
  
  let parts = [];
  
  // Billions
  const billions = Math.floor(num / 1000000000);
  num = num % 1000000000;
  if (billions > 0) {
    if (billions === 1) parts.push("مليار");
    else if (billions === 2) parts.push("ملياران");
    else if (billions >= 3 && billions <= 10) parts.push(convertGroup(billions) + " مليارات");
    else parts.push(convertGroup(billions) + " مليار");
  }
  
  // Millions
  const millions = Math.floor(num / 1000000);
  num = num % 1000000;
  if (millions > 0) {
    if (millions === 1) parts.push("مليون");
    else if (millions === 2) parts.push("مليونان");
    else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + " ملايين");
    else parts.push(convertGroup(millions) + " مليون");
  }
  
  // Thousands
  const thousands = Math.floor(num / 1000);
  num = num % 1000;
  if (thousands > 0) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + " آلاف");
    else parts.push(convertGroup(thousands) + " ألف");
  }
  
  // Hundreds, Tens, Units
  if (num > 0) {
    parts.push(convertGroup(num));
  }
  
  return parts.join(" و");
}

export function tafqeet(amount, currency = 'USD') {
  if (isNaN(amount) || amount === null || amount === undefined) return "";
  
  // Split integer and decimal parts
  const fixedVal = parseFloat(amount).toFixed(2);
  const parts = fixedVal.split(".");
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);
  
  let result = "فقط ";
  
  // Handle integer part
  const integerWords = convertNumberToWords(integerPart);
  result += integerWords;
  
  // Currency mapping
  let currencyLabel = "";
  let subCurrencyLabel = "";
  
  if (currency === 'USD') {
    // USD rules
    if (integerPart === 1) currencyLabel = "دولار أمريكي";
    else if (integerPart === 2) currencyLabel = "دولاران أمريكيان";
    else if (integerPart >= 3 && integerPart <= 10) currencyLabel = "دولارات أمريكية";
    else currencyLabel = "دولار أمريكي";
    
    if (decimalPart > 0) {
      const decWords = convertNumberToWords(decimalPart);
      let centLabel = "";
      if (decimalPart === 1) centLabel = "سنت واحد";
      else if (decimalPart === 2) centLabel = "سنتان";
      else if (decimalPart >= 3 && decimalPart <= 10) centLabel = "سنتات";
      else centLabel = "سنتاً";
      
      subCurrencyLabel = " و" + decWords + " " + centLabel;
    }
  } else if (currency === 'SAR') {
    // SAR rules
    if (integerPart === 1) currencyLabel = "ريال سعودي";
    else if (integerPart === 2) currencyLabel = "ريالان سعوديان";
    else if (integerPart >= 3 && integerPart <= 10) currencyLabel = "ريالات سعودية";
    else currencyLabel = "ريال سعودي";
    
    if (decimalPart > 0) {
      const decWords = convertNumberToWords(decimalPart);
      let halalaLabel = "";
      if (decimalPart === 1) halalaLabel = "هللة واحدة";
      else if (decimalPart === 2) halalaLabel = "هللتان";
      else if (decimalPart >= 3 && decimalPart <= 10) halalaLabel = "هللات";
      else halalaLabel = "هللة";
      
      subCurrencyLabel = " و" + decWords + " " + halalaLabel;
    }
  } else if (currency === 'YER') {
    // YER rules
    if (integerPart === 1) currencyLabel = "ريال يمني";
    else if (integerPart === 2) currencyLabel = "ريالان يمنيان";
    else if (integerPart >= 3 && integerPart <= 10) currencyLabel = "ريالات يمنية";
    else currencyLabel = "ريال يمني";
    
    if (decimalPart > 0) {
      const decWords = convertNumberToWords(decimalPart);
      let filsLabel = "";
      if (decimalPart === 1) filsLabel = "فلس واحد";
      else if (decimalPart === 2) filsLabel = "فلسان";
      else if (decimalPart >= 3 && decimalPart <= 10) filsLabel = "فلوس";
      else filsLabel = "فلساً";
      
      subCurrencyLabel = " و" + decWords + " " + filsLabel;
    }
  }
  
  result += " " + currencyLabel + subCurrencyLabel + " لا غير";
  return result;
}
