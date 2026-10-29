// Short, readable meeting codes like "kfd-wqpz-mtx".
export const generateMeetingCode = () => {
    const letters = "abcdefghijkmnpqrstuvwxyz";
    const part = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
    return `${part(3)}-${part(4)}-${part(3)}`;
};
