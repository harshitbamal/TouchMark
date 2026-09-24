import { useState, useEffect, useRef } from 'react';
import { classService, fingerprintService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { SelectSimple } from '../ui/Select';
import { 
  Fingerprint, 
  PlayCircle, 
  StopCircle, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AttendanceScanner() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [arduinoStatus, setArduinoStatus] = useState({ ready: false, enrolled_count: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const scanIntervalRef = useRef(null);
  const popupTimeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    classService.getAll().then((response) => {
      if (mounted) setClasses(response.classes || []);
    }).catch((error) => {
      console.error('Error fetching classes:', error);
      if (mounted) toast.error('Failed to load classes');
    });
    fingerprintService.checkStatus().then((status) => {
      if (!mounted) return;
      setArduinoStatus(status);
      if (!status.ready) toast.error('Fingerprint scanner is not connected');
    }).catch((error) => {
      console.error('Error checking Arduino status:', error);
      if (mounted) toast.error('Cannot connect to fingerprint scanner');
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  async function checkArduinoStatus() {
    try {
      const status = await fingerprintService.checkStatus();
      setArduinoStatus(status);
      if (!status.ready) {
        toast.error('Arduino fingerprint scanner not connected!');
      }
    } catch (error) {
      console.error('Error checking Arduino status:', error);
      toast.error('Cannot connect to fingerprint scanner');
    }
  };

  const startScanning = () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    if (!arduinoStatus.ready) {
      toast.error('Fingerprint scanner is not ready');
      return;
    }

    setIsScanning(true);
    setMarkedStudents([]);
    toast.success('Attendance scanning started!');

    // Poll every 2 seconds
    scanIntervalRef.current = setInterval(async () => {
      try {
        const result = await fingerprintService.verifyAndMark(selectedClass);
        
        if (result.success && !result.alreadyMarked) {
          // New student marked
          const student = result.student;
          setMarkedStudents(prev => [
            {
              ...student,
              time: new Date().toLocaleTimeString(),
              status: result.attendance.status
            },
            ...prev
          ]);
          
          // Show popup
          setCurrentStudent(student);
          setShowPopup(true);
          playSuccessSound();
          
          // Hide popup after 3 seconds
          popupTimeoutRef.current = setTimeout(() => {
            setShowPopup(false);
          }, 3000);

        } else if (result.alreadyMarked) {
          // Already marked today
          toast(`${result.student.name} already marked`, {
            icon: '⚠️',
          });
          playWarningSound();
        }
      } catch (error) {
        // No fingerprint detected or error - silent
        console.log('Scan attempt:', error.response?.data?.message);
      }
    }, 2000);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    toast.success('Attendance scanning stopped');
  };

  const playSuccessSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
    audio.play().catch(() => {});
  };

  const playWarningSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
    audio.play().catch(() => {});
  };

  const selectedClassData = classes.find(c => c._id === selectedClass);
  const totalStudents = selectedClassData?.students?.length || 0;
  const markedCount = markedStudents.length;
  const percentage = totalStudents > 0 ? (markedCount / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Arduino Status */}
      <Card className={`border-2 ${arduinoStatus.ready ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${arduinoStatus.ready ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">
                  {arduinoStatus.ready ? '✓ Scanner Ready' : '✗ Scanner Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {arduinoStatus.enrolled_count} fingerprints enrolled
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={checkArduinoStatus}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Scanner</CardTitle>
          <CardDescription>
            Select a class and start scanning fingerprints to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <SelectSimple
                value={selectedClass}
                onChange={setSelectedClass}
                placeholder="Select a class"
                options={classes.map(c => ({
                  value: c._id,
                  label: `${c.name} (${c.code})${c.students?.length ? ` - ${c.students.length} students` : ''}`
                }))}
                disabled={isScanning}
              />
            </div>
            <Button 
              onClick={isScanning ? stopScanning : startScanning}
              disabled={!selectedClass || !arduinoStatus.ready}
              variant={isScanning ? 'destructive' : 'default'}
              className="min-w-[150px]"
            >
              {isScanning ? (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
          </div>

          {isScanning && (
            <div className="space-y-4 pt-4 border-t">
              {/* Scanning Animation */}
              <div className="relative h-32 bg-muted rounded-lg overflow-hidden fingerprint-scanner">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-medium text-primary mt-24">
                    👆 Place finger on scanner...
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">
                    Students Marked: {markedCount}/{totalStudents}
                  </span>
                  <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Popup */}
      {showPopup && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 border-4 border-green-500 animate-in zoom-in duration-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">✓ ATTENDANCE MARKED!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <p className="text-2xl font-bold">{currentStudent.name}</p>
              <p className="text-lg text-muted-foreground">{currentStudent.rollNumber}</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString()}
              </p>
              <Badge variant="success" className="mt-4">Welcome to {selectedClassData?.name}! 🎉</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recently Marked Students */}
      {markedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Marked ({markedCount})</CardTitle>
            <CardDescription>Students who marked attendance in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {markedStudents.map((student, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950 animate-in slide-in-from-top duration-300"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.rollNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Present</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{student.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
