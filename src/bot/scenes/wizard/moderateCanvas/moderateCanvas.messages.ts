/** Генерирует текстовое задание для пользователя (UX) */

export function getInputPromptMessage(inputsToFill: Array<{ type: 'photo' | 'text'; name: string }>): {
    text: string,
    options: any
} {
    const photoInputs = inputsToFill.filter(i => i.type === 'photo');
    const textInputs = inputsToFill.filter(i => i.type === 'text');
    const photoNames = photoInputs.map(i => `<b>${i.name}</b>`).join(', ');
    const textNames = textInputs.map(i => `<b>${i.name}</b>`).join(', ');

    const text =
        `Пожалуйста, отправьте ` +
        `${photoInputs.length ? photoInputs.length + ' фото (' + photoNames + ')' : ''}` +
        `${photoInputs.length && textInputs.length ? ' и ' : ''}` +
        `${textInputs.length ? textInputs.length + ' текст(' + textNames + ')' : ''}.\n` +
        `Можно отправлять одним или несколькими сообщениями, в любом порядке.`;

    return {text, options: {parse_mode: 'HTML'}};
}