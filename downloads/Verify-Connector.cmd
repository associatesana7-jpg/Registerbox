@echo off
setlocal
"%~dp0RegisterBox-Tally-Connector.exe" --self-test
if errorlevel 1 (
  echo.
  echo Connector self-test FAILED. Save the message above for troubleshooting.
) else (
  echo.
  echo Connector self-test PASSED. Now test connection to your backed-up Tally company.
)
pause
