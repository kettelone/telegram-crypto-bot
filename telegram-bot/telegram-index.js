const COMMANDS = [
  {
    command: "start",
    description: "Приветствие",
  },
  {
    command: "help",
    description: "Список команд",
  },
  {
    command: "list_recent",
    description: "Список хайповой крипты",
  },
  {
    command: "currency_name",
    description: "Подробная информация",
  },
  {
    command: "addToFavourite {currency_name}",
    description: "Добавить в Избранное ",
  },
  {
    command: "list_favourite",
    description: "Список избранной крипты",
  },
  {
    command: "deleteFavourite {currency_name}",
    description: "Удалить из Избранного",
  },
];

const buttonAdd = {
  inline_keyboard: [
    [
      {
        text: "ADD TO FAVOURITE",
        callback_data: "ADD TO FAVOURITE",
      },
    ],
  ],
};

const buttonDelete = {
  inline_keyboard: [
    [
      {
        text: "REMOVE FROM FAVOURITE",
        callback_data: "REMOVE FROM FAVOURITE",
      },
    ],
  ],
};

export { COMMANDS, buttonAdd, buttonDelete };
