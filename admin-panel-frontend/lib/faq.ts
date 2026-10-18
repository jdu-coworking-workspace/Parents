export type FaqAudience = "parent" | "student";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_STORAGE_KEY = "appuri-faq-v1";

export const defaultFaqs: Record<FaqAudience, FaqItem[]> = {
  parent: [
    {
      id: "parent-1",
      question: "Ilovaga qanday kiraman?",
      answer:
        "Telefon raqamingiz va parolingiz bilan kiring. Parolni unutsangiz, kirish sahifasidagi parolni tiklash tugmasidan foydalaning.",
    },
    {
      id: "parent-2",
      question: "Farzandim haqidagi xabarni qayerdan ko'raman?",
      answer:
        "Bosh sahifada farzandingizni tanlang. Maktab yuborgan xabarlar shu ro'yxatda chiqadi.",
    },
    {
      id: "parent-3",
      question: "Xabar o'qilganini qanday bilaman?",
      answer:
        "Xabarni ochsangiz, u o'qilgan deb belgilanadi. Maktab buni admin panelida ko'radi.",
    },
    {
      id: "parent-4",
      question: "Bildirishnomalar kelmasa nima qilaman?",
      answer:
        "Telefon sozlamalarida ilova bildirishnomalari yoqilganini tekshiring, so'ng ilovani yangilang.",
    },
  ],
  student: [
    {
      id: "student-1",
      question: "Hisobga qanday kiraman?",
      answer:
        "Maktab bergan email va parol bilan kiring. Google orqali ham kirish mumkin.",
    },
    {
      id: "student-2",
      question: "Xabarlarni qanday o'qiyman?",
      answer:
        "Bosh sahifadagi xabar kartasini bosing. Muhim xabarlar rangli belgi bilan chiqadi.",
    },
    {
      id: "student-3",
      question: "Parolni qanday almashtiraman?",
      answer:
        "Sozlamalar bo'limidagi parolni o'zgartirish tugmasini bosing va yangi parolni saqlang.",
    },
    {
      id: "student-4",
      question: "Matn juda kichik ko'rinsa?",
      answer:
        "Sozlamalardagi matn o'lchami orqali shriftni kattalashtirish mumkin.",
    },
  ],
};

function isFaqItem(value: unknown): value is FaqItem {
  if (!value || typeof value !== "object") return false;
  const item = value as FaqItem;
  return (
    typeof item.id === "string" &&
    typeof item.question === "string" &&
    typeof item.answer === "string"
  );
}

export function readStoredFaqs(): Record<FaqAudience, FaqItem[]> {
  if (typeof window === "undefined") {
    return defaultFaqs;
  }

  try {
    const raw = window.localStorage.getItem(FAQ_STORAGE_KEY);
    if (!raw) return defaultFaqs;
    const parsed = JSON.parse(raw) as Partial<Record<FaqAudience, unknown>>;
    return {
      parent: Array.isArray(parsed.parent)
        ? parsed.parent.filter(isFaqItem)
        : defaultFaqs.parent,
      student: Array.isArray(parsed.student)
        ? parsed.student.filter(isFaqItem)
        : defaultFaqs.student,
    };
  } catch {
    return defaultFaqs;
  }
}

export function writeStoredFaqs(faqs: Record<FaqAudience, FaqItem[]>) {
  window.localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs));
}
