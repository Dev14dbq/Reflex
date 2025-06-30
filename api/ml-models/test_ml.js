const { spawn } = require("child_process");
const path = require("path");

// Тестовые данные
const testData = {
  profiles: [
    {
      id: "1",
      city: "Москва",
      birthYear: "2000",
      goals: ["секс", "общение"],
      isVerified: true,
      likesReceived: 10
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
    const pythonPath = path.join(__dirname, "vnev/bin/python3");
    const scriptPath = path.join(__dirname, "rank_profiles.py");
    
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
    
    py.on("close", (code) => {
      console.log("Процесс завершен с кодом:", code);
      
      if (code !== 0) {
        console.error("Ошибка выполнения!");
        console.error("Error output:", errorOutput);
        reject(new Error(`Process exited with code ${code}`));
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