import type { WordEntry } from '../types';

export type LearningEntry = Omit<WordEntry, 'definitions'> & {
  id: string;
  forms: string[];
  sourceId: 'lexiharbor-original-v2';
  definitions: { text: string; example: string; translation?: string }[];
};

type EntryDraft = Pick<LearningEntry, 'word' | 'partOfSpeech' | 'translation' | 'definitions' | 'forms' | 'tags'> & {
  synonyms?: string[];
};

function entry(draft: EntryDraft): LearningEntry {
  return {
    ...draft,
    id: `lexiharbor-original-v2:${draft.word.replaceAll(' ', '-')}`,
    sourceId: 'lexiharbor-original-v2',
    // Deliberately blank: pronunciation and CEFR labels need separate editorial verification.
    phonetic: '',
    level: '',
    synonyms: draft.synonyms ?? [],
  };
}

// Newly drafted learning examples, not imported dictionary text. This is a small,
// non-exhaustive sample. A definition's translation is the translation of its example.
export const learningSample: LearningEntry[] = [
  entry({
    word: 'apple', partOfSpeech: 'noun', translation: '蘋果',
    forms: ['apples'], tags: ['飲食'],
    definitions: [{ text: 'A firm, round fruit with a thin skin and a center containing small seeds.', example: 'I cut an apple into slices for our picnic.', translation: '我把一顆蘋果切成片，準備野餐時吃。' }],
  }),
  entry({
    word: 'bank', partOfSpeech: 'noun', translation: '銀行；河岸',
    forms: ['banks'], tags: ['生活', '自然'],
    definitions: [
      { text: 'A business where people keep money in accounts or apply for loans.', example: 'I went to the bank to open a savings account.', translation: '我到銀行開了一個儲蓄帳戶。' },
      { text: 'The ground along the edge of a river.', example: 'We sat on the river bank and watched the ducks.', translation: '我們坐在河岸上看鴨子。' },
    ],
  }),
  entry({
    word: 'run', partOfSpeech: 'verb', translation: '跑步；經營',
    forms: ['runs', 'ran', 'running'], tags: ['運動', '工作'],
    definitions: [
      { text: 'To move on your feet at a pace faster than walking.', example: 'I run around the park before breakfast.', translation: '我吃早餐前會繞著公園跑步。' },
      { text: 'To be responsible for operating a business or organization.', example: 'My aunt runs a small bakery near the station.', translation: '我阿姨在車站附近經營一家小麵包店。' },
    ],
  }),
  entry({
    word: 'go', partOfSpeech: 'verb', translation: '去；前往',
    forms: ['went', 'gone', 'goes', 'going'], tags: ['生活', '旅行'],
    definitions: [{ text: 'To move or travel to a place away from where you are.', example: 'We went to the beach by bus yesterday.', translation: '我們昨天搭公車去了海邊。' }],
  }),
  entry({
    word: 'take off', partOfSpeech: 'phrasal verb', translation: '起飛；脫下',
    forms: ['takes off', 'took off', 'taken off', 'taking off'], tags: ['旅行', '生活'],
    definitions: [
      { text: 'For an aircraft to leave the ground and begin flying.', example: 'Our plane took off just after sunrise.', translation: '我們的飛機在日出後不久起飛。' },
      { text: 'To remove something you are wearing.', example: 'Please take off your shoes before you come inside.', translation: '進屋前請先脫鞋。' },
    ],
  }),
  entry({
    word: 'book', partOfSpeech: 'noun · verb', translation: '書；預訂',
    forms: ['books', 'booked', 'booking'], tags: ['學習', '旅行'],
    definitions: [
      { text: 'A written work that you can read on printed pages or a screen.', example: 'This book has a short story for every day of the month.', translation: '這本書為一個月中的每一天都安排了一篇短篇故事。' },
      { text: 'To arrange in advance to use a room, seat, or service.', example: 'I booked a room for two nights.', translation: '我訂了一間房，住兩晚。' },
    ],
  }),
  entry({
    word: 'water', partOfSpeech: 'noun · verb', translation: '水；澆水',
    forms: ['waters', 'watered', 'watering'], tags: ['飲食', '自然'],
    definitions: [
      { text: 'The clear liquid that falls as rain and that people need to drink.', example: 'Could I have a glass of water without ice?', translation: '可以給我一杯不加冰的水嗎？' },
      { text: 'To give water to a plant or the soil around it.', example: 'Please water the flowers while I am away.', translation: '我不在的時候，請幫花澆水。' },
    ],
  }),
  entry({
    word: 'work', partOfSpeech: 'noun · verb', translation: '工作；運作',
    forms: ['works', 'worked', 'working'], tags: ['工作', '生活'],
    definitions: [
      { text: 'To spend time doing tasks as part of a job or other responsibility.', example: 'I work in a library three days a week.', translation: '我每週有三天在圖書館工作。' },
      { text: 'Tasks that require effort and need to be done.', example: 'We still have some work to finish before lunch.', translation: '午餐前我們還有一些工作要完成。' },
      { text: 'To operate in the way that something is supposed to.', example: 'The kitchen light works again after I changed the bulb.', translation: '我換了燈泡之後，廚房的燈又能正常亮了。' },
    ],
  }),
  entry({
    word: 'learn', partOfSpeech: 'verb', translation: '學習；學會',
    forms: ['learns', 'learned', 'learnt', 'learning'], tags: ['學習'],
    definitions: [{ text: 'To gain knowledge or a skill through study, practice, or experience.', example: 'I am learning to cook one new dish each week.', translation: '我每週都在學做一道新菜。' }],
  }),
  entry({
    word: 'curious', partOfSpeech: 'adjective', translation: '好奇的；奇特的',
    forms: [], tags: ['個性', '學習'], synonyms: ['inquisitive'],
    definitions: [
      { text: 'Wanting to find out more about something.', example: 'The children were curious about how the bridge was built.', translation: '孩子們很好奇這座橋是怎麼蓋的。' },
      { text: 'Strange in a way that attracts attention.', example: 'A curious sound came from the empty room.', translation: '空房間裡傳來一陣奇怪的聲音。' },
    ],
  }),
  entry({
    word: 'beautiful', partOfSpeech: 'adjective', translation: '美麗的；優美的',
    forms: [], tags: ['感受', '自然'],
    definitions: [{ text: 'Giving a strong feeling of pleasure through appearance, sound, or another quality.', example: 'The evening sky looked beautiful from our balcony.', translation: '從我們的陽台望出去，傍晚的天空很美。' }],
  }),
  entry({
    word: 'resilient', partOfSpeech: 'adjective', translation: '有韌性的；能從困境中恢復的',
    forms: [], tags: ['個性', '工作'],
    definitions: [{ text: 'Able to recover and keep going after a setback or difficult experience.', example: 'The resilient team rebuilt the shop after the flood.', translation: '這支有韌性的團隊在洪水過後重建了店面。' }],
  }),
  entry({
    word: 'serendipity', partOfSpeech: 'noun', translation: '偶然遇見美好事物的幸運',
    forms: [], tags: ['感受', '旅行'],
    definitions: [{ text: 'Good luck that leads you to something worthwhile when you were not searching for it.', example: 'It was serendipity: a wrong turn led us to a wonderful little café.', translation: '這真是意外之喜：我們轉錯了彎，卻找到一家很棒的小咖啡館。' }],
  }),
  entry({
    word: 'clarity', partOfSpeech: 'noun', translation: '清晰；明確',
    forms: [], tags: ['溝通', '學習'], synonyms: ['clearness'],
    definitions: [{ text: 'The quality of being clear enough to understand without confusion.', example: 'A simple drawing added clarity to the instructions.', translation: '一張簡單的圖讓說明更清楚了。' }],
  }),
  entry({
    word: 'wander', partOfSpeech: 'verb', translation: '閒逛；走神',
    forms: ['wanders', 'wandered', 'wandering'], tags: ['旅行', '學習'], synonyms: ['roam'],
    definitions: [
      { text: 'To move around without following a fixed route or plan.', example: 'We wandered through the old streets until we found a place for lunch.', translation: '我們在老街裡隨意逛著，直到找到吃午餐的地方。' },
      { text: 'For your thoughts to move away from what you should be focusing on.', example: 'My mind wandered while I waited for the next question.', translation: '等下一個問題時，我不知不覺走神了。' },
    ],
  }),
  entry({
    word: 'thrive', partOfSpeech: 'verb', translation: '茁壯成長；蓬勃發展',
    forms: ['thrives', 'thrived', 'throve', 'thriven', 'thriving'], tags: ['自然', '成長'], synonyms: ['flourish'],
    definitions: [{ text: 'To grow well or make strong progress in suitable conditions.', example: 'These herbs thrive on a sunny kitchen windowsill.', translation: '這些香草在廚房陽光充足的窗臺上長得很好。' }],
  }),
  entry({
    word: 'mindful', partOfSpeech: 'adjective', translation: '留意的；顧及的',
    forms: [], tags: ['生活', '溝通'], synonyms: ['aware'],
    definitions: [{ text: 'Paying attention to something and considering it when you act.', example: 'Please be mindful of the neighbors when you play music at night.', translation: '晚上放音樂時，請顧及鄰居。' }],
  }),
  entry({
    word: 'perspective', partOfSpeech: 'noun', translation: '觀點；看事情的角度',
    forms: ['perspectives'], tags: ['溝通', '思考'], synonyms: ['viewpoint'],
    definitions: [{ text: 'The way you understand a situation, shaped by where you stand and what you have experienced.', example: 'Working at the front desk gave me a different perspective on customer service.', translation: '在櫃檯工作讓我對顧客服務有了不同的看法。' }],
  }),
  entry({
    word: 'concise', partOfSpeech: 'adjective', translation: '簡明扼要的',
    forms: [], tags: ['溝通', '工作'], synonyms: ['succinct', 'brief'],
    definitions: [{ text: 'Expressing the necessary ideas clearly without using extra words.', example: 'Her concise email told us exactly where to meet and what to bring.', translation: '她簡明扼要的電子郵件清楚告訴我們集合地點和該帶的東西。' }],
  }),
  entry({
    word: 'delight', partOfSpeech: 'noun · verb', translation: '喜悅；使感到欣喜',
    forms: ['delights', 'delighted', 'delighting'], tags: ['感受'], synonyms: ['joy'],
    definitions: [
      { text: 'A strong feeling of happiness about something pleasant.', example: 'To my delight, my sister arrived in time for dinner.', translation: '令我開心的是，姊姊及時趕上了晚餐。' },
      { text: 'To give someone a strong feeling of happiness.', example: 'The unexpected birthday message delighted my grandfather.', translation: '那則意外收到的生日祝福讓爺爺非常開心。' },
    ],
  }),
  entry({
    word: 'adapt', partOfSpeech: 'verb', translation: '適應；調整以符合需要',
    forms: ['adapts', 'adapted', 'adapting'], tags: ['成長', '工作'], synonyms: ['adjust'],
    definitions: [
      { text: 'To become comfortable with new conditions by changing how you act.', example: 'It took me a few weeks to adapt to my new work schedule.', translation: '我花了幾個星期才適應新的工作時間。' },
      { text: 'To change something so that it works for a different purpose or situation.', example: 'We adapted the recipe for a smaller oven.', translation: '我們調整了食譜，讓它適合用小一點的烤箱製作。' },
    ],
  }),
  entry({
    word: 'insight', partOfSpeech: 'noun', translation: '深入的了解；洞察',
    forms: ['insights'], tags: ['思考', '工作'], synonyms: ['understanding'],
    definitions: [{ text: 'An understanding that helps you see why something happens or what it really means.', example: 'Talking with regular customers gave us insight into why they returned.', translation: '和常客聊天，讓我們更了解他們為什麼會再度光顧。' }],
  }),
  entry({
    word: 'arrive', partOfSpeech: 'verb', translation: '抵達；到達',
    forms: ['arrives', 'arrived', 'arriving'], tags: ['旅行'],
    definitions: [{ text: 'To reach the place you have been traveling to.', example: 'We arrived at the hotel before the rain started.', translation: '下雨前，我們就抵達飯店了。' }],
  }),
  entry({
    word: 'leave', partOfSpeech: 'verb', translation: '離開；留下',
    forms: ['leaves', 'left', 'leaving'], tags: ['生活', '旅行'],
    definitions: [
      { text: 'To go away from the place where you are.', example: 'We need to leave home by seven to catch the train.', translation: '我們得在七點前出門，才趕得上火車。' },
      { text: 'To put or keep something in a place when you go elsewhere.', example: 'I left a spare key with my neighbor.', translation: '我把一把備用鑰匙留在鄰居那裡。' },
    ],
  }),
  entry({
    word: 'buy', partOfSpeech: 'verb', translation: '買；購買',
    forms: ['buys', 'bought', 'buying'], tags: ['購物'],
    definitions: [{ text: 'To get something in exchange for money.', example: 'I bought a reusable bottle for my daily commute.', translation: '我買了一個可重複使用的水瓶，平常通勤時帶著用。' }],
  }),
  entry({
    word: 'pay', partOfSpeech: 'verb', translation: '付錢；支付',
    forms: ['pays', 'paid', 'paying'], tags: ['購物'],
    definitions: [{ text: 'To give money for something you receive or to settle an amount you owe.', example: 'Can I pay for these tickets by card?', translation: '這些票可以刷卡付款嗎？' }],
  }),
  entry({
    word: 'cost', partOfSpeech: 'verb · noun', translation: '要花費；費用',
    forms: ['costs', 'costing'], tags: ['購物', '旅行'],
    definitions: [
      { text: 'To require a particular amount of money to buy or use.', example: 'The bus ride costs thirty dollars.', translation: '這趟公車車資是三十元。' },
      { text: 'The amount of money needed for something.', example: 'The cost of breakfast is included in the room price.', translation: '房價已包含早餐費用。' },
    ],
  }),
  entry({
    word: 'bring', partOfSpeech: 'verb', translation: '帶來；帶上',
    forms: ['brings', 'brought', 'bringing'], tags: ['生活'],
    definitions: [{ text: 'To take someone or something with you to the place being discussed.', example: 'Please bring your own towel to the swimming lesson.', translation: '來上游泳課時，請自備毛巾。' }],
  }),
  entry({
    word: 'borrow', partOfSpeech: 'verb', translation: '借入；借用',
    forms: ['borrows', 'borrowed', 'borrowing'], tags: ['生活', '學習'],
    definitions: [{ text: 'To receive something from someone with the intention of giving it back.', example: 'May I borrow your umbrella until tomorrow?', translation: '我可以借用你的雨傘，明天再還你嗎？' }],
  }),
  entry({
    word: 'lend', partOfSpeech: 'verb', translation: '借出',
    forms: ['lends', 'lent', 'lending'], tags: ['生活'],
    definitions: [{ text: 'To let someone use something you own for a time and then return it.', example: 'My neighbor lent me a ladder to fix the light.', translation: '鄰居借我一把梯子，讓我修燈。' }],
  }),
  entry({
    word: 'choose', partOfSpeech: 'verb', translation: '選擇；挑選',
    forms: ['chooses', 'chose', 'chosen', 'choosing'], tags: ['生活', '購物'],
    definitions: [{ text: 'To decide which person, thing, or action you want from the available options.', example: 'You can choose a sandwich or a bowl of soup for lunch.', translation: '午餐你可以選三明治或一碗湯。' }],
  }),
  entry({
    word: 'need', partOfSpeech: 'verb', translation: '需要',
    forms: ['needs', 'needed', 'needing'], tags: ['生活'],
    definitions: [{ text: 'To require something because it is necessary for you or for what you are doing.', example: 'I need a quiet place to finish this report.', translation: '我需要一個安靜的地方來完成這份報告。' }],
  }),
  entry({
    word: 'want', partOfSpeech: 'verb', translation: '想要',
    forms: ['wants', 'wanted', 'wanting'], tags: ['生活'],
    definitions: [{ text: 'To have a wish to get something or do something.', example: 'I want to spend the weekend with my family.', translation: '我想和家人一起過週末。' }],
  }),
  entry({
    word: 'help', partOfSpeech: 'verb · noun', translation: '幫忙；協助',
    forms: ['helps', 'helped', 'helping'], tags: ['生活', '溝通'],
    definitions: [
      { text: 'To make a task or situation easier for someone.', example: 'Could you help me carry this box upstairs?', translation: '你可以幫我把這個箱子搬上樓嗎？' },
      { text: 'Support that makes it easier to do something or deal with a problem.', example: 'Thank you for your help with the move.', translation: '謝謝你幫忙搬家。' },
    ],
  }),
  entry({
    word: 'meet', partOfSpeech: 'verb', translation: '見面；初次認識',
    forms: ['meets', 'met', 'meeting'], tags: ['生活', '溝通'],
    definitions: [
      { text: 'To come together with someone at a place, often by arrangement.', example: 'Let us meet outside the library at two.', translation: '我們兩點在圖書館外面見。' },
      { text: 'To see and speak with someone for the first time.', example: 'I met my new neighbors at the community picnic.', translation: '我在社區野餐活動上認識了新鄰居。' },
    ],
  }),
  entry({
    word: 'make', partOfSpeech: 'verb', translation: '製作；做出',
    forms: ['makes', 'made', 'making'], tags: ['生活', '飲食'],
    definitions: [{ text: 'To create something by putting materials or ingredients together.', example: 'We made vegetable soup with what was in the fridge.', translation: '我們用冰箱裡現有的食材煮了蔬菜湯。' }],
  }),
  entry({
    word: 'read', partOfSpeech: 'verb', translation: '閱讀；讀',
    forms: ['reads', 'reading'], tags: ['學習'],
    definitions: [{ text: 'To look at written words and understand what they say.', example: 'I read a few pages before I turn out the light.', translation: '我關燈前會讀幾頁書。' }],
  }),
  entry({
    word: 'write', partOfSpeech: 'verb', translation: '寫；書寫',
    forms: ['writes', 'wrote', 'written', 'writing'], tags: ['學習', '溝通'],
    definitions: [{ text: 'To record words by hand or with a keyboard.', example: 'Please write your name at the top of the form.', translation: '請在表格上方寫下你的名字。' }],
  }),
  entry({
    word: 'speak', partOfSpeech: 'verb', translation: '說話；說某種語言',
    forms: ['speaks', 'spoke', 'spoken', 'speaking'], tags: ['學習', '溝通'],
    definitions: [
      { text: 'To use your voice to say words to another person or a group.', example: 'Please speak a little more slowly.', translation: '請說慢一點。' },
      { text: 'To be able to communicate in a particular language.', example: 'My cousin speaks both English and Japanese.', translation: '我表姊會說英文和日文。' },
    ],
  }),
  entry({
    word: 'listen', partOfSpeech: 'verb', translation: '聆聽；用心聽',
    forms: ['listens', 'listened', 'listening'], tags: ['溝通', '學習'],
    definitions: [{ text: 'To pay attention to a sound or to what someone is saying.', example: 'I listen to short stories while I wash the dishes.', translation: '我洗碗時會聽短篇故事。' }],
  }),
  entry({
    word: 'understand', partOfSpeech: 'verb', translation: '理解；聽懂',
    forms: ['understands', 'understood', 'understanding'], tags: ['學習', '溝通'],
    definitions: [{ text: 'To grasp the meaning of something or how it works.', example: 'I understand the question, but I need time to think about my answer.', translation: '我懂這個問題，但需要一點時間想想怎麼回答。' }],
  }),
  entry({
    word: 'remember', partOfSpeech: 'verb', translation: '記得；想起',
    forms: ['remembers', 'remembered', 'remembering'], tags: ['學習', '生活'],
    definitions: [{ text: 'To keep a fact or experience in your mind, or bring it back to mind.', example: 'I remember the little shop where we bought our first bicycles.', translation: '我記得那家小店，我們的第一輛腳踏車就是在那裡買的。' }],
  }),
  entry({
    word: 'forget', partOfSpeech: 'verb', translation: '忘記',
    forms: ['forgets', 'forgot', 'forgotten', 'forgetting'], tags: ['學習', '生活'],
    definitions: [{ text: 'To fail to remember something you knew or intended to do.', example: 'I forgot to put my lunch in my bag this morning.', translation: '今天早上我忘了把午餐放進包包。' }],
  }),
  entry({
    word: 'start', partOfSpeech: 'verb', translation: '開始',
    forms: ['starts', 'started', 'starting'], tags: ['生活', '學習'], synonyms: ['begin'],
    definitions: [{ text: 'To begin an activity, process, or event.', example: 'The next language class starts on Monday.', translation: '下一期語言課星期一開始。' }],
  }),
  entry({
    word: 'finish', partOfSpeech: 'verb', translation: '完成；結束',
    forms: ['finishes', 'finished', 'finishing'], tags: ['工作', '學習'],
    definitions: [{ text: 'To reach the end of an activity or complete what needs to be done.', example: 'I finished the report and sent it before dinner.', translation: '我在晚餐前完成報告並寄出了。' }],
  }),
  entry({
    word: 'open', partOfSpeech: 'verb · adjective', translation: '打開；開著的；營業中的',
    forms: ['opens', 'opened', 'opening'], tags: ['生活'],
    definitions: [
      { text: 'To move a door, lid, or similar part so that an entrance or inside space is accessible.', example: 'Could you open the window for a little fresh air?', translation: '你可以打開窗戶，讓一點新鮮空氣進來嗎？' },
      { text: 'Not closed, or available for people to enter and use.', example: 'The café is open until nine tonight.', translation: '這家咖啡館今晚營業到九點。' },
    ],
  }),
  entry({
    word: 'close', partOfSpeech: 'verb · adjective', translation: '關閉；近的',
    forms: ['closes', 'closed', 'closing', 'closer', 'closest'], tags: ['生活', '旅行'],
    definitions: [
      { text: 'To move a door, lid, or similar part so that an opening is covered.', example: 'Please close the gate after you walk through it.', translation: '走過去之後，請把門關上。' },
      { text: 'Only a short distance away.', example: 'Our hotel is close to the train station.', translation: '我們的飯店離火車站很近。' },
    ],
  }),
  entry({
    word: 'enjoy', partOfSpeech: 'verb', translation: '享受；喜歡',
    forms: ['enjoys', 'enjoyed', 'enjoying'], tags: ['感受', '生活'],
    definitions: [{ text: 'To get pleasure from something you do or experience.', example: 'I enjoy walking by the river after work.', translation: '我喜歡下班後到河邊散步。' }],
  }),
  entry({
    word: 'tired', partOfSpeech: 'adjective', translation: '疲倦的；累的',
    forms: [], tags: ['感受', '生活'],
    definitions: [{ text: 'Needing rest because your energy has been used up.', example: 'I felt tired after carrying the boxes all afternoon.', translation: '搬了一下午的箱子後，我覺得很累。' }],
  }),
  entry({
    word: 'hungry', partOfSpeech: 'adjective', translation: '餓的',
    forms: ['hungrier', 'hungriest'], tags: ['飲食', '感受'],
    definitions: [{ text: 'Feeling that you need or want to eat.', example: 'I am hungry because I missed breakfast.', translation: '我沒吃早餐，所以現在很餓。' }],
  }),
  entry({
    word: 'weather', partOfSpeech: 'noun', translation: '天氣',
    forms: [], tags: ['自然', '旅行'],
    definitions: [{ text: 'The outdoor conditions at a place and time, such as rain, wind, or heat.', example: 'If the weather stays dry, we will eat outside.', translation: '如果天氣維持乾燥、沒有下雨，我們就在戶外吃飯。' }],
  }),
  entry({
    word: 'station', partOfSpeech: 'noun', translation: '車站',
    forms: ['stations'], tags: ['旅行'],
    definitions: [{ text: 'A place where trains stop and passengers can get on or off.', example: 'The station is a ten-minute walk from my house.', translation: '從我家走到車站要十分鐘。' }],
  }),
  entry({
    word: 'ticket', partOfSpeech: 'noun', translation: '票；入場券',
    forms: ['tickets'], tags: ['旅行', '生活'],
    definitions: [{ text: 'A paper or electronic record that gives you the right to travel or enter an event.', example: 'Keep your ticket ready for the staff at the entrance.', translation: '請先準備好票，讓入口的工作人員查驗。' }],
  }),
  entry({
    word: 'breakfast', partOfSpeech: 'noun', translation: '早餐',
    forms: ['breakfasts'], tags: ['飲食'],
    definitions: [{ text: 'The meal usually eaten in the morning after getting up.', example: 'We had eggs and toast for breakfast.', translation: '我們早餐吃了蛋和烤吐司。' }],
  }),
  entry({
    word: 'friend', partOfSpeech: 'noun', translation: '朋友',
    forms: ['friends'], tags: ['人際'],
    definitions: [{ text: 'Someone you know, like, and choose to spend time with.', example: 'A friend showed me a quieter route to the beach.', translation: '一位朋友帶我走了一條比較清幽的路去海邊。' }],
  }),
  entry({
    word: 'family', partOfSpeech: 'noun', translation: '家庭；家人',
    forms: ['families'], tags: ['人際'],
    definitions: [{ text: 'People connected as parents, children, partners, or other relatives.', example: 'My family gets together for a meal every Sunday.', translation: '我們家每個星期日都會聚在一起吃飯。' }],
  }),
  entry({
    word: 'home', partOfSpeech: 'noun', translation: '家；住處',
    forms: ['homes'], tags: ['生活'],
    definitions: [{ text: 'The place where you live and keep the things of your everyday life.', example: 'Our new home has a small balcony for plants.', translation: '我們的新家有個可以種植物的小陽台。' }],
  }),
  entry({
    word: 'time', partOfSpeech: 'noun', translation: '時間；次',
    forms: ['times'], tags: ['生活'],
    definitions: [
      { text: 'What we measure in seconds, minutes, hours, and longer periods.', example: 'Do we have enough time for a short walk before dinner?', translation: '晚餐前我們有足夠的時間散個步嗎？' },
      { text: 'One occasion on which something happens.', example: 'I have watched that film three times.', translation: '那部電影我已經看過三次了。' },
    ],
  }),
  entry({
    word: 'find', partOfSpeech: 'verb', translation: '找到；發現',
    forms: ['finds', 'found', 'finding'], tags: ['生活'],
    definitions: [{ text: 'To discover where something is or come across it.', example: 'I found my keys in the pocket of yesterday\'s jacket.', translation: '我在昨天穿的外套口袋裡找到了鑰匙。' }],
  }),
  entry({
    word: 'look for', partOfSpeech: 'phrasal verb', translation: '尋找',
    forms: ['looks for', 'looked for', 'looking for'], tags: ['生活', '旅行'],
    definitions: [{ text: 'To try to find someone or something.', example: 'We are looking for a café with a place to charge our phones.', translation: '我們正在找一家有地方能替手機充電的咖啡館。' }],
  }),
];

export const learningSampleMetadata = {
  id: 'lexiharbor-original-v2',
  sourceId: 'lexiharbor-original-v2',
  title: 'LexiHarbor 原創學習小樣',
  version: 2,
  status: 'editorial-sample',
  entryCount: learningSample.length,
  sourceLanguage: 'en',
  targetLanguage: 'zh-Hant',
  authorship: 'ai-drafted-original',
  editorialReview: 'model-only',
  humanEditorialReview: 'pending',
  externalDictionaryTextUsed: false,
  description: '為本專案由 AI 獨立撰寫的 60 筆學習詞條，附英文定義、例句與繁中例句翻譯。',
  reviewNote: '已進行模型語義檢查，尚未經專業編輯或母語者正式編校。僅收錄選定義項，非完整字典；音標與 CEFR 等級尚未提供。',
} as const;
