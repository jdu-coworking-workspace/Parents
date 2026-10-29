export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const parentFaqs: FaqItem[] = [
  {
    id: 'parent-1',
    question: 'Ilovaga qanday kiraman?',
    answer:
      'Telefon raqamingiz va parolingiz bilan kiring. Parolni unutsangiz, kirish sahifasidagi parolni tiklash tugmasidan foydalaning.',
  },
  {
    id: 'parent-2',
    question: "Farzandim haqidagi xabarni qayerdan ko'raman?",
    answer:
      "Bosh sahifada farzandingizni tanlang. Maktab yuborgan xabarlar shu ro'yxatda chiqadi.",
  },
  {
    id: 'parent-3',
    question: "Xabar o'qilganini qanday bilaman?",
    answer:
      "Xabarni ochsangiz, u o'qilgan deb belgilanadi. Maktab buni admin panelida ko'radi.",
  },
  {
    id: 'parent-4',
    question: 'Bildirishnomalar kelmasa nima qilaman?',
    answer:
      'Telefon sozlamalarida ilova bildirishnomalari yoqilganini tekshiring, so‘ng ilovani yangilang.',
  },
];
