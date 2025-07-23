import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiLock, FiAlertTriangle, FiEye, FiDatabase } from "react-icons/fi";
import { PageTransition } from "../../components/ui/PageTransition";
import styles from "./scss/Legal.module.scss";

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className={styles.legalPage}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
          <span>Назад</span>
        </button>
        
        <div className={styles.headerContent}>
          <div className={styles.iconContainer}>
            <FiShield className={styles.headerIcon} />
          </div>
          <h1 className={styles.title}>Политика конфиденциальности</h1>
          <p className={styles.subtitle}>
            Как мы обрабатываем и защищаем ваши данные
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.lastUpdated}>
          <FiAlertTriangle className={styles.updateIcon} />
          <span>Последнее обновление: 17 января 2025 г.</span>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Введение</h2>
          <div className={styles.sectionContent}>
            <p>
              Настоящая Политика конфиденциальности описывает, как платформа Reflex («мы», «наш», «нас») 
              собирает, использует, хранит и защищает вашу персональную информацию при использовании 
              нашего сервиса.
            </p>
            <p>
              Мы серьезно относимся к защите вашей конфиденциальности и принимаем все необходимые 
              меры для обеспечения безопасности ваших данных.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FiDatabase className={styles.sectionIcon} />
            2. Какую информацию мы собираем
          </h2>
          <div className={styles.sectionContent}>
            <h3 className={styles.subsectionTitle}>Информация профиля</h3>
            <ul className={styles.list}>
              <li>Имя (псевдоним) для отображения в профиле</li>
              <li>Возраст (год рождения)</li>
              <li>Город проживания</li>
              <li>Описание профиля</li>
              <li>Фотографии профиля</li>
              <li>Предпочтения и цели использования сервиса</li>
            </ul>

            <h3 className={styles.subsectionTitle}>Техническая информация</h3>
            <ul className={styles.list}>
              <li>IP-адрес и данные о местоположении</li>
              <li>Информация об устройстве и браузере</li>
              <li>Данные об активности в приложении</li>
              <li>Логи взаимодействий с сервисом</li>
            </ul>

            <h3 className={styles.subsectionTitle}>Данные взаимодействий</h3>
            <ul className={styles.list}>
              <li>Сообщения и переписки с другими пользователями</li>
              <li>Лайки, дислайки и совпадения</li>
              <li>Настройки поиска и фильтры</li>
              <li>Жалобы и обращения в службу поддержки</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FiEye className={styles.sectionIcon} />
            3. Как мы используем вашу информацию
          </h2>
          <div className={styles.sectionContent}>
            <p>Мы используем собранную информацию для:</p>
            <ul className={styles.list}>
              <li>Предоставления основного функционала платформы знакомств</li>
              <li>Подбора подходящих профилей и рекомендаций</li>
              <li>Обеспечения безопасности и предотвращения мошенничества</li>
              <li>Улучшения качества сервиса и пользовательского опыта</li>
              <li>Модерации контента и соблюдения правил сообщества</li>
              <li>Связи с вами по вопросам сервиса</li>
              <li>Анализа использования платформы (в анонимизированном виде)</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Передача данных третьим лицам</h2>
          <div className={styles.sectionContent}>
            <p>
              Мы не продаем, не сдаем в аренду и не передаем ваши персональные данные третьим лицам, 
              за исключением следующих случаев:
            </p>
            <ul className={styles.list}>
              <li>С вашего явного согласия</li>
              <li>Поставщикам технических услуг (хостинг, аналитика) при соблюдении конфиденциальности</li>
              <li>По требованию правоохранительных органов в рамках действующего законодательства</li>
              <li>Для защиты наших прав, безопасности пользователей или предотвращения мошенничества</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FiLock className={styles.sectionIcon} />
            5. Безопасность данных
          </h2>
          <div className={styles.sectionContent}>
            <p>
              Для защиты ваших данных мы применяем следующие меры безопасности:
            </p>
            <ul className={styles.list}>
              <li>Шифрование данных при передаче (SSL/TLS)</li>
              <li>Безопасное хранение данных на защищенных серверах</li>
              <li>Ограниченный доступ к персональным данным сотрудников</li>
              <li>Регулярные проверки безопасности и обновления</li>
              <li>Мониторинг подозрительной активности</li>
              <li>Резервное копирование данных</li>
            </ul>
            <div className={styles.warningBox}>
              <FiAlertTriangle className={styles.warningIcon} />
              <p>
                Несмотря на принимаемые меры, абсолютной безопасности в интернете не существует. 
                Мы рекомендуем быть осторожными при обмене личной информацией с другими пользователями.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Хранение данных</h2>
          <div className={styles.sectionContent}>
            <p>
              Мы храним ваши персональные данные до тех пор, пока:
            </p>
            <ul className={styles.list}>
              <li>Ваш аккаунт остается активным</li>
              <li>Данные необходимы для предоставления сервиса</li>
              <li>Требуется соблюдение правовых обязательств</li>
              <li>Необходимо для разрешения споров</li>
            </ul>
            <p>
              После удаления аккаунта ваши данные будут удалены в течение 30 дней, 
              за исключением информации, которую мы обязаны хранить по закону.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Ваши права</h2>
          <div className={styles.sectionContent}>
            <p>
              В отношении ваших персональных данных вы имеете право:
            </p>
            <ul className={styles.list}>
              <li>Запросить доступ к вашим данным</li>
              <li>Исправить неточную или неполную информацию</li>
              <li>Удалить ваши данные (право на забвение)</li>
              <li>Ограничить обработку ваших данных</li>
              <li>Получить копию ваших данных в машиночитаемом формате</li>
              <li>Возразить против обработки данных</li>
              <li>Подать жалобу в надзорный орган</li>
            </ul>
            <p>
              Для реализации этих прав обратитесь к нам через функцию обратной связи в приложении.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Файлы cookie и аналогичные технологии</h2>
          <div className={styles.sectionContent}>
            <p>
              Мы используем файлы cookie и аналогичные технологии для:
            </p>
            <ul className={styles.list}>
              <li>Аутентификации и поддержания сессий</li>
              <li>Запоминания ваших предпочтений</li>
              <li>Анализа использования сервиса</li>
              <li>Обеспечения безопасности</li>
            </ul>
            <p>
              Вы можете управлять настройками cookie в вашем браузере, однако это может 
              повлиять на функциональность сервиса.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Дети и несовершеннолетние</h2>
          <div className={styles.sectionContent}>
            <p>
              Наш сервис предназначен исключительно для лиц старше 18 лет. Мы сознательно 
              не собираем персональные данные от лиц младше 18 лет.
            </p>
            <p>
              Если нам станет известно, что мы получили персональные данные от несовершеннолетнего, 
              мы примем меры для немедленного удаления такой информации.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Изменения в политике</h2>
          <div className={styles.sectionContent}>
            <p>
              Мы можем время от времени обновлять настоящую Политику конфиденциальности. 
              О существенных изменениях мы уведомим вас через приложение или по электронной почте.
            </p>
            <p>
              Дата последнего обновления указана в начале документа. Рекомендуем периодически 
              проверять эту страницу на предмет изменений.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Международные переводы данных</h2>
          <div className={styles.sectionContent}>
            <p>
              Ваши данные могут обрабатываться на серверах, расположенных в разных странах. 
              Мы обеспечиваем адекватную защиту ваших данных при международных переводах 
              в соответствии с применимым законодательством.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Контактная информация</h2>
          <div className={styles.sectionContent}>
            <p>
              Если у вас есть вопросы о настоящей Политике конфиденциальности или обработке 
              ваших персональных данных, обратитесь к нам через приложение или по электронной почте.
            </p>
            <p>
              Мы стремимся ответить на все запросы в течение 30 дней.
            </p>
          </div>
        </section>

        <div className={styles.agreementFooter}>
          <div className={styles.footerIcon}>
            <FiShield />
          </div>
          <p>
            Ваша конфиденциальность важна для нас. Мы обязуемся защищать ваши данные 
            и обеспечивать прозрачность в вопросах их обработки.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}; 