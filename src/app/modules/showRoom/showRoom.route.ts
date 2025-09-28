import express from 'express';
import { showRoomController } from './showRoom.controller';

const router = express.Router();

router
  .route('/')
  .post(showRoomController.createShowRoom)
  .get(showRoomController.getAllShowRooms);

router
  .route('/:id')
  .get(showRoomController.getSingleShowRoomDetails)
  .put(showRoomController.updateShowRoom)
  .delete(showRoomController.deleteShowRoom);

router
  .route('/recycle/:id')
  .patch(showRoomController.moveToRecycledbinShowRoom);
router
  .route('/restore/:id')
  .patch(showRoomController.restoreFromRecyledbinShowRoom);
router
  .route('/delete-permanantly/:id')
  .delete(showRoomController.permanantlyDeleteShowRoom);

  router.patch(
    '/recycle-all',
    showRoomController.moveAllToRecycledBinMoneyReceipts,
  );
  router.patch(
    '/restore-all',
    showRoomController.restoreAllFromRecycledBinMoneyReceipts,
  );
  

export const ShowRoomRoutes = router;
