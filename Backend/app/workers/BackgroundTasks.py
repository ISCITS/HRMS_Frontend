import logging

objLogger = logging.getLogger(__name__)


class clsBackgroundTasks:
    @staticmethod
    def sendEmail(strRecipient: str, strSubject: str, strBody: str) -> None:
        # Controllers or services can offload non-blocking side effects here instead of holding the request open.
        objLogger.info("Queued email for recipient=%s subject=%s", strRecipient, strSubject)

    @staticmethod
    def generateReport(strReportName: str) -> None:
        # Long-running report generation can be triggered from business workflows and executed asynchronously.
        objLogger.info("Queued report generation for report=%s", strReportName)
