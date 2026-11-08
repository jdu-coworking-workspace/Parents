export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const studentFaqs: FaqItem[] = [
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
    answer: "Sozlamalardagi matn o'lchami orqali shriftni kattalashtirish mumkin.",
  },
];
