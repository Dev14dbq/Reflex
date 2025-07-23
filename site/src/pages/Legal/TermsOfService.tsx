import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiShield, FiAlertTriangle } from "react-icons/fi";
import { PageTransition } from "../../components/ui/PageTransition";
import styles from "./scss/Legal.module.scss";

export const TermsOfService: React.FC = () => {
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
            <FiFileText className={styles.headerIcon} />
          </div>
          <h1 className={styles.title}>Пользовательское соглашение</h1>
          <p className={styles.subtitle}>
            Условия использования платформы Reflex
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.lastUpdated}>
          <FiAlertTriangle className={styles.updateIcon} />
          <span>Последнее обновление: 17 января 2025 г.</span>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Общие положения</h2>
          <div className={styles.sectionContent}>
            <p>
              Настоящее Пользовательское соглашение («Соглашение») регулирует отношения между 
              администрацией платформы Reflex («Администрация», «мы») и пользователями 
              («Пользователь», «вы») при использовании платформы Reflex.
            </p>
            <p>
              Используя платформу Reflex, вы подтверждаете, что прочитали, поняли и согласны 
              соблюдать настоящее Соглашение и все применимые законы и нормативные акты.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Описание сервиса</h2>
          <div className={styles.sectionContent}>
            <p>
              Reflex — это платформа для знакомств и общения, предназначенная для пользователей 
              старше 18 лет. Платформа предоставляет возможности для:
            </p>
            <ul className={styles.list}>
              <li>Создания личного профиля</li>
              <li>Поиска и просмотра профилей других пользователей</li>
              <li>Общения с другими пользователями через встроенный чат</li>
              <li>Обмена фотографиями и сообщениями</li>
              <li>Настройки предпочтений для поиска</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Возрастные ограничения</h2>
          <div className={styles.sectionContent}>
            <p>
              Платформа Reflex предназначена исключительно для совершеннолетних пользователей. 
              Для использования сервиса вы должны:
            </p>
            <ul className={styles.list}>
              <li>Быть не младше 18 лет</li>
              <li>Иметь право заключать юридически обязывающие соглашения</li>
              <li>Не быть запрещенным от использования сервиса согласно законам вашей юрисдикции</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Регистрация и безопасность аккаунта</h2>
          <div className={styles.sectionContent}>
            <p>
              При регистрации на платформе вы обязуются:
            </p>
            <ul className={styles.list}>
              <li>Предоставлять достоверную и актуальную информацию</li>
              <li>Поддерживать безопасность своего аккаунта</li>
              <li>Незамедлительно уведомлять о любом несанкционированном использовании</li>
              <li>Нести ответственность за все действия, совершенные от вашего имени</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Правила поведения</h2>
          <div className={styles.sectionContent}>
            <p>
              При использовании платформы Reflex запрещается:
            </p>
            <ul className={styles.list}>
              <li>Размещать оскорбительный, угрожающий или дискриминационный контент</li>
              <li>Распространять спам, рекламу или нежелательные сообщения</li>
              <li>Использовать чужие фотографии или ложную информацию</li>
              <li>Домогаться других пользователей после получения отказа</li>
              <li>Размещать контент сексуального характера с участием несовершеннолетних</li>
              <li>Нарушать права интеллектуальной собственности</li>
              <li>Использовать автоматизированные средства для взаимодействия с платформой</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Контент пользователей</h2>
          <div className={styles.sectionContent}>
            <p>
              Размещая контент на платформе, вы:
            </p>
            <ul className={styles.list}>
              <li>Подтверждаете, что являетесь автором или имеете права на размещение контента</li>
              <li>Предоставляете нам лицензию на использование, отображение и распространение контента</li>
              <li>Понимаете, что контент может быть модерируемым</li>
              <li>Соглашаетесь с возможным удалением неподходящего контента</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Модерация и блокировка</h2>
          <div className={styles.sectionContent}>
            <p>
              Администрация оставляет за собой право:
            </p>
            <ul className={styles.list}>
              <li>Модерировать контент и сообщения пользователей</li>
              <li>Временно или постоянно заблокировать аккаунт при нарушении правил</li>
              <li>Удалять неподходящий контент без предварительного уведомления</li>
              <li>Принимать меры по обеспечению безопасности платформы</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Отказ от ответственности</h2>
          <div className={styles.sectionContent}>
            <p>
              Платформа предоставляется "как есть". Администрация не несет ответственности за:
            </p>
            <ul className={styles.list}>
              <li>Действия других пользователей платформы</li>
              <li>Точность информации в профилях пользователей</li>
              <li>Результаты взаимодействия между пользователями</li>
              <li>Временные технические сбои или перебои в работе</li>
              <li>Любые убытки, связанные с использованием платформы</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Изменение условий</h2>
          <div className={styles.sectionContent}>
            <p>
              Администрация оставляет за собой право изменять настоящее Соглашение в любое время. 
              Изменения вступают в силу с момента их публикации на платформе. Продолжение 
              использования сервиса после внесения изменений означает ваше согласие с новыми условиями.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Контактная информация</h2>
          <div className={styles.sectionContent}>
            <p>
              По вопросам, связанным с настоящим Соглашением, вы можете обратиться к администрации 
              через функцию обратной связи в приложении или по электронной почте.
            </p>
          </div>
        </section>

        <div className={styles.agreementFooter}>
          <div className={styles.footerIcon}>
            <FiShield />
          </div>
          <p>
            Используя платформу Reflex, вы подтверждаете, что прочитали и согласны 
            с настоящим Пользовательским соглашением.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}; 