from fastapi import APIRouter, HTTPException, Query

from ..database import list_notifications, mark_all_notifications_read, mark_notification_read, unread_notification_count

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def notifications(limit: int = Query(default=100, ge=1, le=500), unread_only: bool = False,
                  site_id: int | None = Query(default=None, ge=1)):
    try:
        return list_notifications(limit, unread_only, site_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="알림을 불러오지 못했습니다.") from exc


@router.get("/unread-count")
def unread_count():
    try:
        return {"count": unread_notification_count()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="읽지 않은 알림 수를 불러오지 못했습니다.") from exc


@router.patch("/read-all")
def read_all_notifications():
    try:
        return {"updated": mark_all_notifications_read()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="알림을 모두 읽음 처리하지 못했습니다.") from exc


@router.patch("/{notification_id}/read")
def read_notification(notification_id: int):
    try:
        if not mark_notification_read(notification_id):
            raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
        return {"id": notification_id, "is_read": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="알림을 읽음 처리하지 못했습니다.") from exc
