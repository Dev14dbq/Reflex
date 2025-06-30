import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';

export const ReadIcon: React.FC<{ read: boolean }> = ({ read }) => {
  return (
    <span className={read ? "text-white" : "text-white/50"}>
      {read ? (
        <DoneAllIcon style={{ fontSize: 16 }} color="inherit" />
      ) : (
        <DoneIcon style={{ fontSize: 16 }} color="inherit" />
      )}
    </span>
  );
};
