const { spawn } = require("child_process");
const path = require("path");

// Тестовые данные
const testData = {
  profiles: [
    {
      id: "1",
      city: "Москва",
      birthYear: "2010",
      goals: ["секс", "общение"],
      isVerified: true, 
      likesReceived: 40
    },
    {
      id: "2",
      city: "Санкт-Петербург",
      birthYear: "1998",
      goals: ["отношения", "общение"],
      isVerified: false,
      likesReceived: 5
    },
    {
      id: "3",
      city: "Москва",
      birthYear: "2001",
      goals: ["секс", "фото"],
      isVerified: true,
      likesReceived: 15
    }
  ],
  user: {
    city: "Москва",
    birthYear: "2000",
    goals: ["секс", "общение"],
    trustScore: 50
  }
};

async function testRankProfiles() {
  return new Promise((resolve, reject) => {
    // Проверяем, существует ли исполняемый файл python3
    const fs = require("fs");
    const pythonPath = path.join(__dirname, "venv", "Scripts", "python.exe");
    const scriptPath = path.join(__dirname, "rank_profiles.py");

    if (!fs.existsSync(pythonPath)) {
      console.error("❌ Не найден исполняемый файл Python по пути:", pythonPath);
      reject(
        new Error(
          `Не найден исполняемый файл Python по пути: ${pythonPath}\n` +
          "Проверьте, что виртуальное окружение создано и активировано, а также что путь указан верно."
        )
      );
      return;
    }

    if (!fs.existsSync(scriptPath)) {
      console.error("❌ Не найден скрипт Python по пути:", scriptPath);
      reject(
        new Error(
          `Не найден скрипт Python по пути: ${scriptPath}\n` +
          "Проверьте, что файл rank_profiles.py существует в директории ml-models."
        )
      );
      return;
    }

    console.log("Запуск ML модели...");
    console.log("Python path:", pythonPath);
    console.log("Script path:", scriptPath);

    const py = spawn(pythonPath, [scriptPath]);

    const input = JSON.stringify(testData);

    let result = "";
    let errorOutput = "";

    py.stdout.on("data", (chunk) => {
      result += chunk;
      console.log("Получен output:", chunk.toString());
    });

    py.stderr.on("data", (err) => {
      errorOutput += err.toString();
      console.error("ML ERROR:", err.toString());
    });

    py.on("error", (err) => {
      // Обработка ошибок запуска процесса (например, ENOENT)
      console.error("Ошибка запуска процесса Python:", err);
      reject(
        new Error(
          `Ошибка запуска процесса Python: ${err.message}\n` +
          "Возможные причины: неверный путь к python3, отсутствует виртуальное окружение, нет прав на запуск."
        )
      );
    });

    py.on("close", (code) => {
      console.log("Процесс завершен с кодом:", code);

      if (code !== 0) {
        console.error("Ошибка выполнения!");
        console.error("Error output:", errorOutput);
        reject(new Error(`Process exited with code ${code}\n${errorOutput}`));
        return;
      }

      try {
        const data = JSON.parse(result);
        console.log("Результат ранжирования:", data);
        resolve(data);
      } catch (e) {
        console.error("Ошибка парсинга результата:", e);
        console.error("Raw result:", result);
        reject(e);
      }
    });

    py.stdin.write(input);
    py.stdin.end();
  });
}

// Запускаем тест
testRankProfiles()
  .then(result => {
    console.log("\n✅ Тест успешно пройден!");
    console.log("Отсортированные профили:", result);
  })
  .catch(err => {
    console.error("\n❌ Тест провален:", err);
  });