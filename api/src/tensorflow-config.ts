import * as tf from '@tensorflow/tfjs-node';

// Отключаем все логи TensorFlow.js
tf.enableProdMode();

// Устанавливаем уровень логирования
process.env.TF_CPP_MIN_LOG_LEVEL = '2';

// Отключаем логи регистрации ядер
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Перехватываем логи TensorFlow.js
console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (!message.includes('TensorFlow') &&
        !message.includes('backend') &&
        !message.includes('kernel') &&
        !message.includes('already registered')) {
        originalConsoleLog(...args);
    }
};

console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (!message.includes('TensorFlow') &&
        !message.includes('backend') &&
        !message.includes('kernel') &&
        !message.includes('already registered')) {
        originalConsoleWarn(...args);
    }
};

export default tf; 